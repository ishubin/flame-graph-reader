
// width of a single character in a frame rect
// this is used to optimize performance so that we don't call measureText all the time
let _canvasCharacterWidth = 0;

export function render(frameHeight, canvas, frameData, settings, backgroundColor, offsetX, zoomX, hoveredFrame, annotations) {
    const ctx = canvas.getContext('2d');

    const width = window.innerWidth;
    const height = (frameData.rootFrame.maxDepth + 2) * frameHeight;

    // fixing rendering for retina
    if (window.devicePixelRatio === 2) {
        canvas.width = width*2;
        canvas.height = height*2;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

        ctx.scale(2, 2);
    }

    ctx.fillStyle = backgroundColor;
    ctx.rect(0, 0, width, height);
    ctx.fill();

    ctx.strokeStyle = 'rgba(0, 0, 0, 1.0)';
    ctx.font = '12px Courier new';


    for (let i = 0; i < frameData.rects.length; i++) {
        drawFrameRect(ctx, frameData, frameData.rects[i], width, height, frameHeight, settings, offsetX, zoomX, hoveredFrame, annotations);
    }

    return {
        width,
        height
    };
}

export function drawFrameRect(ctx, frameData, rect, width, height, frameHeight, settings, offsetX, zoomX, hoveredFrame, annotations) {
    if (_canvasCharacterWidth === 0) {
        // This is a simple trick to optimize the performance of rendering a lot of frames.
        // The "measureText" function is very expensive so we don't want to run it for each frame.
        // The trick is to use monospaced font like "Courier new" so that we can easily calculate the width of a single character
        // This is allows us to only call it once. Next time we need to draw the text on top of a frame
        // - we will know how much space we would need for it based on the single character width
        const text = 'aaaaaaaaaaaaaaaaaaaa';
        _canvasCharacterWidth = ctx.measureText(text).width / text.length;
    }

    const frame = frameData.findFrameById(rect.id);

    let y = Math.floor(rect.d * frameHeight);
    if (settings.inverted) {
        y = Math.floor(height - (rect.d + 1) * frameHeight);
    }
    if (y < 0 || y > height) {
        return;
    }
    let x = width * (rect.x + offsetX) * zoomX;
    let x2 = Math.round(x + rect.w * width * zoomX);

    x = Math.round(x);

    if (x2 < 0 || x > width)  {
        return;
    }
    if (x < 0) {
        x = 0;
    }
    if (x2 > width) {
        x2 = width;
    }

    ctx.fillStyle = colorForRect(rect, frame, hoveredFrame, annotations);
    ctx.fillRect(x, y, Math.max(1, x2-x), frameHeight);

    if (!settings.compact) {
        ctx.fillStyle = 'rgba(0, 0, 0, 1.0)';
        let w = x2 - x;
        let name = rect.name;
        let padding = 2;

        let pixelOffset = 0;
        if (frame.mark) {
            if (w > 15) {
                ctx.fillText(Mark.symbolFor(rect.mark), x + w - 15, y + 12, 20);
                pixelOffset = 15;
            }
        }

        let realTextWidth = Math.round(name.length * _canvasCharacterWidth);
        if (realTextWidth > w - 2 * padding - pixelOffset) {
            let numberOfCharacters = Math.floor(name.length * (w + 2*padding - pixelOffset) / realTextWidth);
            numberOfCharacters -= 3; // compensating for ellipsis
            if (numberOfCharacters > 0) {

                ctx.fillText(name.substring(0, numberOfCharacters) + '\u2026', x + padding, y + 12, w);
            }
        } else {
            ctx.fillText(name, x + padding, y + 12, w);
        }
    }
}

//TODO customize this coloring
function hueForName(name) {
    let hue = 0;
    for (let i = 0; i < name.length; i++) {
        hue = (hue + name.charCodeAt(i) * 37) % 15 + 40;
    }
    return hue;
}

function colorForRect(rect, frame, hoveredFrame, annotations) {
    let delta = 0;
    if (frame.diffRatio) {
        delta = Math.max(-1, Math.min(frame.diffRatio, 1));
    }

    let hue = 0;
    if (rect.quickSearchMatched) {
        // TODO customize quick search coloring
        hue = 280;
    } else if (rect.annotationIndex >= 0) {
        hue = annotations[rect.annotationIndex].color.h;
    } else if (rect.mark) {
        hue = Mark.hueFor(rect.mark);
    } else if (delta !== 0) {
        if (delta > 0) {
            hue = 60 * (1 - delta) + 120 * delta;
        } else {
            hue = 60 * (1 + delta);
        }
    } else {
        hue = hueForName(rect.name);
    }

    const saturation = rect.dimmed ? 30 : 93;
    const light = (hoveredFrame.rect && hoveredFrame.rect.id === rect.id) ? 85 : 71;

    return `hsl(${hue}, ${saturation}%, ${light}%)`;
}