/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

function addFramesToFrame(currentFrame, frameNames, samples) {
    currentFrame.samples += samples;
    if (frameNames.length > 0) {
        const frameName = frameNames[0];
        if (!currentFrame.childFrames.has(frameName)) {
            currentFrame.childFrames.set(frameName, {
                name       : frameName,
                samples    : 0,
                childFrames: new Map(),
                depth      : currentFrame.depth + 1
            });
        }
        frameNames.shift();
        addFramesToFrame(currentFrame.childFrames.get(frameName), frameNames, samples);
    }
}

function parseFrames(log) {
    const lines = log.split('\n');
    
    const rootFrame = {
        name       : 'all',
        samples    : 0,
        childFrames: new Map(),
        depth      : 0
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line) {
            const frames = lines[i].split(';');


            const spaceIndex = frames[frames.length - 1].lastIndexOf(' ');
            if (spaceIndex > 0) {
                const endFrame = frames[frames.length - 1];
                const samples = parseInt(endFrame.substring(spaceIndex + 1));
                frames[frames.length - 1] = endFrame.substring(0, spaceIndex);
                
                addFramesToFrame(rootFrame, frames, samples);
            }
        }
    }
    
    return rootFrame;
}


function createIdGenerator() {
    return {
        id: -1,
        generate() {
            this.id += 1;
            return this.id;
        }
    }
}



function enrichFrame(currentFrame, idGenerator, parentId) {
    if (!idGenerator) {
        idGenerator = createIdGenerator();
    }
    currentFrame.id = idGenerator.generate();
    currentFrame.selfSamples = currentFrame.samples;
    if (parentId || parentId === 0) {
        currentFrame.parentId = parentId;
    }

    if (!currentFrame.childFrames) {
        return;
    }
    let maxDepth = currentFrame.depth;
    currentFrame.childFrames.forEach(childFrame => {
        currentFrame.selfSamples -= childFrame.samples;
        const maxDepthInChild = enrichFrame(childFrame, idGenerator, currentFrame.id);
        if (maxDepth < maxDepthInChild) {
            maxDepth = maxDepthInChild;
        }
    });
    
    currentFrame.maxDepth = maxDepth;
    return maxDepth;
}

function visitFrames(currentFrame, callback, parentFrame) {
    callback(currentFrame, parentFrame);
    if (!currentFrame.childFrames) {
        return;
    }

    currentFrame.childFrames.forEach(childFrame => {
        visitFrames(childFrame, callback, currentFrame);
    });
}

function sortFrames(currentFrame) {
    if (!currentFrame || !currentFrame.childFrames) {
        return;
    }
    currentFrame.childFrames = new Map([...currentFrame.childFrames.entries()].sort());
    currentFrame.childFrames.forEach(childFrame => sortFrames(childFrame));
}

export function parseProfilingLog(log) {
    const rootFrame = parseFrames(log);
    sortFrames(rootFrame);
    enrichFrame(rootFrame);
    return rootFrame;
}

function copyChildFrames(srcFrame, dstFrame) {
    srcFrame.childFrames.forEach((childFrame, childFrameName) => {
        const dstChild = {
            name       : childFrame.name,
            childFrames: new Map(),
            samples    : childFrame.samples,
            selfSamples: childFrame.selfSamples,
            depth      : childFrame.depth
        };
        dstFrame.childFrames.set(childFrameName, dstChild);

        copyChildFrames(childFrame, dstChild);
    });
}


class FrameData {
    constructor(rootFrame, rects, framesMap) {
        this.rootFrame  = rootFrame;
        this.rects      = rects;
        this.framesMap  = framesMap;
    }

    toJSONObject() {
        const _traverse = (frame) => {
            const jsonFrame = {
                childFrames: {},
                samples: frame.samples,
                selfSamples: frame.selfSamples,
            };
            if (frame.mark) {
                jsonFrame.mark = frame.mark;
            }
            frame.childFrames.forEach((childFrame, childFrameName) => {
                jsonFrame.childFrames[childFrameName] = _traverse(childFrame);
            });

            return jsonFrame;
        };
        return {
            frame: _traverse(this.rootFrame)
        };
    }

    clone() {
        const newRoot = {
            name       : this.rootFrame.name,
            childFrames: new Map(),
            samples    : this.rootFrame.samples,
            selfSamples: this.rootFrame.selfSamples,
            depth      : this.rootFrame.depth
        };

        copyChildFrames(this.rootFrame, newRoot);
        enrichFrame(newRoot);

        return generateFrameData(newRoot);
    }

    collectStackTrace(stackId) {
        if (!stackId) {
            return '';
        }
        const frame = this.framesMap[stackId];
        if (frame) {
            return frame.name +'\n' + this.collectStackTrace(frame.parentId);
        }
        return '';
    }

    findFrameById(id) {
        return this.framesMap[id];
    }

    findRectByIndex(idx) {
        if (0 <= idx && idx < this.rects.length) {
            return this.rects[idx];
        }
        return null;
    }

    findRectForFrame(frame) {
        if (!frame) {
            return null;
        }
        return this.findRectByIndex(frame.rectIndex);
    }

    traverseRectAncestors(rect, callback) {
        const parentFrame = this.findFrameById(rect.parentId);
        if (!parentFrame) {
            return;
        }

        const parentRect = this.findRectByIndex(parentFrame.rectIndex);
        if (!parentRect) {
            return;
        }

        callback(parentRect);
        this.traverseRectAncestors(parentRect, callback);
    }
    
    /**
     * Traverses tree of frames starting at the root
     * @param {Function} callback 
     */
    traverseFrames(callback) {
        this._traverseFrames(this.rootFrame, null, callback);
    }
    _traverseFrames(frame, parentFrame, callback) {
        callback(frame, parentFrame);
        frame.childFrames.forEach(childFrame => {
            this._traverseFrames(childFrame, frame, callback);
        });
    }

    traverseFramesStartingFrom(frame, callback) {
        this._traverseFrames(frame, null, callback);
    }


    /**
     * Tries to find all frames of the same length with the largest depth.
     * It assumes that during collection of stack-traces their depth was limited,
     * so in the resulting report they would all end up with the same max depth.
     * Once it finds those frames it will trie to repair frame by frame
     */
    repairBrokenFrames() {
        const brokenFrameNames = [];
        let maxBrokenDepth = 0;

        this.rootFrame.childFrames.forEach((frame, frameName) => {
            if (maxBrokenDepth < frame.maxDepth) {
                maxBrokenDepth = frame.maxDepth;
                brokenFrameNames.length = 0;
                brokenFrameNames.push(frameName);
            } else if (maxBrokenDepth === frame.maxDepth) {
                brokenFrameNames.push(frameName);
            }
        });

        for(let i = 0; i < brokenFrameNames.length; i++) {
            const frame = this.rootFrame.childFrames.get(brokenFrameNames[i]);
            this.repairFrame(frame);
        }
    }

    /**
     * Tries to find the frame with the same name that is further away and merge the specified frame at that point
     * @param {*} frameForRepair
     */
    repairFrame(frameForRepair) {
        // doing bredth search first, since we are trying to find a frame that is a bit further away.
        const queue = [this.rootFrame];
        let frameForMerge = null;
        while(queue.length > 0 && !frameForMerge) {
            const frame = queue.shift();
            frame.childFrames.forEach(childFrame => {
                if (childFrame.id !== frameForRepair.id) {
                    queue.push(childFrame);
                }
            });
            if (frame.name === frameForRepair.name && frame.id !== frameForRepair.id && frame.depth > frameForRepair.depth) {
                frameForMerge = frame;
            }
        }

        if (!frameForMerge) {
            return;
        }

        if (frameForMerge.id !== frameForRepair.id) {
            const parentFrame = this.findParentFrameForFrame(frameForRepair);
            parentFrame.childFrames.delete(frameForRepair.name);
            this.mergeFrames(frameForMerge, frameForRepair);

            // walking up the frames in order to update all ancestor samples
            this.traverseAncestorFramesUntil(frameForMerge, 
                frame => {frame.samples += frameForRepair.samples},
                frame => frame.id !== parentFrame.id
            );
        }

        enrichFrame(this.rootFrame);

        const newFrameData = generateFrameData(this.rootFrame);
        this.rootFrame  = newFrameData.rootFrame;
        this.rects      = newFrameData.rects;
        this.framesMap  = newFrameData.framesMap;
    }

    traverseAncestorFramesUntil(frame, callback, conditionCallback) {
        const parentFrame = this.findParentFrameForFrame(frame);
        if (!parentFrame) {
            return;
        }

        if (conditionCallback(parentFrame)) {
            callback(parentFrame);
            this.traverseAncestorFramesUntil(parentFrame, callback, conditionCallback);
        }
    }

    findParentFrameForFrame(frame) {
        return this.findFrameById(frame.parentId);
    }

    /**
     * Merges srcFrame into dstFrame
     * @param {*} dstFrame 
     * @param {*} srcFrame 
     */
    mergeFrames(dstFrame, srcFrame) {
        dstFrame.samples += srcFrame.samples;
        srcFrame.childFrames.forEach(childSrcFrame => {
            if (dstFrame.childFrames.has(childSrcFrame.name)) {
                this.mergeFrames(dstFrame.childFrames.get(childSrcFrame.name), childSrcFrame);
            } else {
                this.appendNewChildFrame(dstFrame, childSrcFrame);
            }
        });
    }

    appendNewChildFrame(frame, childFrame) {
        const newChildFrame = {
            name: childFrame.name,
            samples: childFrame.samples,
            childFrames: new Map(),
            depth      : frame.depth + 1
        };
        frame.childFrames.set(childFrame.name, newChildFrame);

        childFrame.childFrames.forEach(childChildFrame => {
            this.appendNewChildFrame(newChildFrame, childChildFrame);
        });
    }

    compareWith(otherRootFrame) {
        this._compareWith(this.rootFrame, otherRootFrame, this.rootFrame.samples, otherRootFrame.samples);
    }

    _compareWith(frame, otherFrame, totalSamples, otherTotalSamples) {
        if (otherFrame) {
            const ratio = frame.samples / totalSamples;
            frame.otherRatio = otherFrame.samples / otherTotalSamples;
            frame.diffRatio = (frame.otherRatio - ratio) / ratio;
            frame.otherSamples = otherFrame.samples;
            frame.otherSelfSamples = otherFrame.selfSamples;
        } else {
            frame.diffRatio = -1.0;
            frame.otherRatio = 0.0;
            frame.otherSamples = 0;
            frame.otherSelfSamples = 0;
        }

        const rect = this.findRectForFrame(frame);
        if (rect) {
            let delta = Math.max(-1, Math.min(frame.diffRatio, 1));
            let hue = 0;
            if (delta > 0) {
                hue = 60 * (1 - delta) + 120 * delta;
            } else {
                hue = 60 * (1 + delta);
            }

            // rect.color = {h: hue, s: 90, l: 50};
        }

        frame.childFrames.forEach((childFrame, childFrameName) => {
            const otherChild = otherFrame ? otherFrame.childFrames.get(childFrameName) : null;

            this._compareWith(childFrame, otherChild, totalSamples, otherTotalSamples);
        });
    }
}


export function generateFrameData(currentFrame) {
    const rects = [];
    const framesMap = {};

    const maxSamples = currentFrame.samples;

    visitFrames(currentFrame, (frame, parentFrame) => {
        framesMap[frame.id] = frame;
        frame.childOffset = frame.selfSamples/maxSamples;

        let offset = 0;
        if (parentFrame) {
            offset = parentFrame.childOffset + parentFrame.x;
            parentFrame.childOffset += frame.samples/maxSamples;
        }
        const rect = {
            name    : frame.name,
            samples : frame.samples,
            id      : frame.id,
            parentId: parentFrame ? parentFrame.id: null,
            w       : frame.samples/maxSamples,
            x       : offset,
            d       : frame.depth,
        };
        frame.x = offset;
        frame.rectIndex = rects.length;
        rects.push(rect);
    });

    return new FrameData(currentFrame, rects, framesMap);
}


export function loadFlameGraphFormat(json) {
    const convertFrame = (jsonFrame, jsonFrameName, parentFrame) => {
        const frame = {
            name: jsonFrameName,
            samples: jsonFrame.samples,
            selfSamples: jsonFrame.selfSamples,
            childFrames: new Map(),
            depth: parentFrame ? parentFrame.depth + 1 : 0
        };
        if (jsonFrame.mark) {
            frame.mark = jsonFrame.mark;
        }
        if (jsonFrame.childFrames) {
            for (let childName in jsonFrame.childFrames) {
                if (jsonFrame.childFrames.hasOwnProperty(childName)) {
                    frame.childFrames.set(childName, convertFrame(jsonFrame.childFrames[childName], childName, frame));
                }
            }
        }

        return frame;
    };

    const rootFrame = convertFrame(json.frameData.frame, 'all');
    enrichFrame(rootFrame);
    return generateFrameData(rootFrame);
}