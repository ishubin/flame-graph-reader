
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
    currentFrame.childFrames.forEach(childFrame => {
        currentFrame.selfSamples -= childFrame.samples;
        enrichFrame(childFrame, idGenerator, currentFrame.id);
    });
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

function color(name) {
    let hue = parseInt(Math.floor(Math.random()*50));
    return {h: hue, s: 93, l: 61};
}


class FrameData {
    constructor(rootFrame, rects, framesMap, nameLookup) {
        this.rootFrame = rootFrame;
        this.rects     = rects;
        this.framesMap = framesMap;
        this.name      = nameLookup;
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
     * Tries to find the frame with the same name that is further away and merge the specified frame at that point
     * @param {*} frameForRepair
     */
    repairFrame(frameForRepair) {
        let depth = frameForRepair.depth;
        let frameForMerge = frameForRepair;
        this.traverseFrames(frame => {
            if (frame.name === frameForRepair.name && depth < frame.depth) {
                frameForMerge = frame;
                depth = frame.depth;
            }
        });

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
        this.rootFrame = newFrameData.rootFrame;
        this.rects     = newFrameData.rects;
        this.framesMap = newFrameData.framesMap;
        this.name      = newFrameData.nameLookup;
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
}


export function generateFrameData(currentFrame) {
    const rects = [];
    const framesMap = {};
    const nameLookup = {};


    const cacheByName = (frame) => {
        if (!nameLookup.hasOwnProperty(frame.name)) {
            nameLookup[frame.name] = [];
        }
        nameLookup[frame.name].push(frame);
    };

    const maxSamples = currentFrame.samples;

    visitFrames(currentFrame, (frame, parentFrame) => {
        framesMap[frame.id] = frame;
        frame.childOffset = frame.selfSamples/maxSamples;
        cacheByName(frame);

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
            color   : color(frame.name)
        };
        frame.x = offset;
        frame.rectIndex = rects.length;
        rects.push(rect);
    });

    return new FrameData(currentFrame, rects, framesMap, nameLookup);
}
