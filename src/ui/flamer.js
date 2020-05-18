
function addFramesToFrame(currentFrame, frameNames, samples) {
    currentFrame.samples += samples;
    if (frameNames.length > 0) {
        const frameName = frameNames[0];
        if (!currentFrame.childFrames.hasOwnProperty(frameName)) {
            currentFrame.childFrames[frameName] = {
                name       : frameName,
                samples    : 0,
                childFrames: {},
                depth      : currentFrame.depth + 1
            };
        }
        frameNames.shift();
        addFramesToFrame(currentFrame.childFrames[frameName], frameNames, samples);
    }
}

function parseFrames(log) {
    const lines = log.split('\n');
    
    const rootFrame = {
        name       : 'all',
        samples    : 0,
        childFrames: {},
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

    for (let childFrameName in currentFrame.childFrames) {
        if (currentFrame.childFrames.hasOwnProperty(childFrameName)) {
            currentFrame.selfSamples -= currentFrame.childFrames[childFrameName].samples;
            enrichFrame(currentFrame.childFrames[childFrameName], idGenerator, currentFrame.id);
        }
    }
}

function visitFrames(currentFrame, callback, parentFrame) {
    callback(currentFrame, parentFrame);
    if (currentFrame.childFrames) {
        for (let childFrameName in currentFrame.childFrames) {
            if (currentFrame.childFrames.hasOwnProperty(childFrameName)) {
                visitFrames(currentFrame.childFrames[childFrameName], callback, currentFrame);
            }
        }
    }
}

export function parseProfilingLog(log) {
    const rootFrame = parseFrames(log);
    enrichFrame(rootFrame);
    return rootFrame;
}

function color(name) {
    let hue = parseInt(Math.floor(Math.random()*50));
    
    return 'hsl(' + hue + ', 93%, 61%)';
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
        rects.push(rect);
    });

    return new FrameData(currentFrame, rects, framesMap, nameLookup);
}
