class ObjectsController {
    hitCirclesList;
    slidersList;
    objectsList;
    judgementList = [];
    drawTime;
    coloursList;
    breakPeriods;
    currentColor;
    coloursObject;
    lastTimestamp = 0;
    lastTime = 0;
    tempW = Game.WIDTH;
    tempH = Game.HEIGHT;

    filtered = [];

    _in = [];

    static requestID = null;
    static lastTimestamp;

    // static preempt = 0;

    compare(a, b) {
        if (a.obj.time < b.obj.time) {
            return -1;
        }
        if (a.obj.time > b.obj.time) {
            return 1;
        }
        return 0;
    }

    constructor(objectsList, coloursList, breakPeriods) {
        this.objectsList = objectsList.sort(this.compare);
        this.hitCirclesList = objectsList.filter((o) => o.obj instanceof HitCircle || o.obj instanceof Spinner);
        this.slidersList = objectsList.filter((o) => o.obj instanceof Slider);

        this.breakPeriods = breakPeriods;
    }

    draw(timestamp, staticDraw) {
        if (timestamp > beatmapFile.audioNode.duration) {
            beatmapFile.audioNode.pause();
        }

        Game.FPS.text = `${Math.round(Game.APP.ticker.FPS)}fps\n${parseFloat(Game.APP.ticker.deltaMS).toFixed(2)}ms`;
        this.lastTime = performance.now();

        if (didMove && currentX !== -1 && currentY !== -1) {
            draggingEndTime = beatmapFile.audioNode.getCurrentTime();
            handleCanvasDrag(false, true);
        }

        updateTime(timestamp);
        setSliderTime();

        const currentAR = Clamp(Beatmap.stats.approachRate * (mods.HR ? 1.4 : 1) * (mods.EZ ? 0.5 : 1), 0, 10);
        const currentPreempt = Beatmap.difficultyRange(currentAR, 1800, 1200, 450);

        const compareFunc = (element, value) => {
            if ((sliderAppearance.hitAnim ? element.obj.killTime : Math.max(element.obj.killTime + 800, element.obj.killTime)) < value) return -1;
            if (element.obj.time - currentPreempt > value) return 1;
            return 0;
        };

        const drawList = [];
        const foundIndex = binarySearch(this.objectsList, timestamp, compareFunc);
        if (foundIndex !== -1) {
            let start = foundIndex - 1;
            let end = foundIndex + 1;

            while (start >= 0 && compareFunc(this.objectsList[start], timestamp) === 0) {
                drawList.push(this.objectsList[start]);
                start--;
            }

            drawList.reverse();
            drawList.push(this.objectsList[foundIndex]);

            while (end <= this.objectsList.length - 1 && compareFunc(this.objectsList[end], timestamp) === 0) {
                drawList.push(this.objectsList[end]);
                end++;
            }
        }

        this.filtered = drawList;

        const selected = [];
        selectedHitObject.forEach((time) => {
            const objIndex = binarySearch(this.objectsList, time, (element, value) => {
                if (element.obj.time === value) return 0;
                if (element.obj.time < value) return -1;
                if (element.obj.time > value) return 1;
            });

            if (objIndex === -1) return;

            const o = this.objectsList[objIndex];
            selected.push(o);
        });

        const judgements = this.judgementList.filter((judgement) => judgement.time - 200 < timestamp && judgement.time + 1800 + 200 > timestamp);

        Game.CONTAINER.removeChildren();
        Game.addToContainer([
            ...judgements,
            ...this.filtered.map((o) => o.obj).toReversed(),
            ...this.filtered
                .map((o) => o.obj.approachCircleObj)
                .filter((o) => o)
                .toReversed(),
            ...selected
                .reduce((accm, o) => {
                    if (o.obj instanceof Slider) accm.push({ obj: o.obj.hitCircle.selected }, { obj: o.obj.selectedSliderEnd });
                    accm.push({ obj: o.obj.selected });
                    return accm;
                }, [])
                .toReversed(),
        ]);

        if (this.breakPeriods.some((period) => period[0] < timestamp && period[1] > timestamp)) {
            document.querySelector("#overlay").style.backgroundColor = `rgba(0 0 0 / ${document.querySelector("#dim").value * 0.7})`;
        } else {
            document.querySelector("#overlay").style.backgroundColor = `rgba(0 0 0 / ${document.querySelector("#dim").value})`;
        }

        Timeline.draw(timestamp);

        judgements.forEach((object) => {
            object.draw(timestamp);
        });

        this.filtered.forEach((object) => {
            selected.forEach((o) => o.obj.drawSelected());
            object.obj.draw(Math.max(timestamp, 0));
        });

        if (ScoreParser.CURSOR_DATA) {
            const posInfoIndex = ScoreParser.CURSOR_DATA.slice(0, -1).findLastIndex((cursorData) => cursorData.time <= timestamp);
            const lerp_x =
                ScoreParser.CURSOR_DATA[posInfoIndex].x +
                ((timestamp - ScoreParser.CURSOR_DATA[posInfoIndex].time) /
                    (ScoreParser.CURSOR_DATA[posInfoIndex + 1].time - ScoreParser.CURSOR_DATA[posInfoIndex].time)) *
                    (ScoreParser.CURSOR_DATA[posInfoIndex + 1].x - ScoreParser.CURSOR_DATA[posInfoIndex].x);
            const lerp_y =
                ScoreParser.CURSOR_DATA[posInfoIndex].y +
                ((timestamp - ScoreParser.CURSOR_DATA[posInfoIndex].time) /
                    (ScoreParser.CURSOR_DATA[posInfoIndex + 1].time - ScoreParser.CURSOR_DATA[posInfoIndex].time)) *
                    (ScoreParser.CURSOR_DATA[posInfoIndex + 1].y - ScoreParser.CURSOR_DATA[posInfoIndex].y);

            if (posInfoIndex !== -1) {
                // Game.CURSOR.x = Game.OFFSET_X + lerp_x * (Game.WIDTH / 512);
                // Game.CURSOR.y = Game.OFFSET_Y + lerp_y * (Game.WIDTH / 512);

                Game.CURSOR.update(posInfoIndex, lerp_x, lerp_y);
            }
        }

        ObjectsController.lastTimestamp = timestamp;

        // ObjectsController.requestID = window.requestAnimationFrame((currentTime) => {
        //     if (beatmapFile.audioNode !== undefined && beatmapFile !== undefined) {
        //         const currentAudioTime = beatmapFile.audioNode.getCurrentTime();
        //         const timestampNext = currentAudioTime;
        //         this.lastTimestamp = timestamp;
        //         ObjectsController.lastTimestamp = timestamp;

        //         return this.draw(timestampNext);
        //     }
        // });
    }

    reinitializeAllSliders() {
        const start = performance.now();
        this.objectsList.forEach((o) => {
            if (o.obj instanceof Slider) o.obj.reInitialize();
        });
        console.log(`ReInitialize all sliders took: ${performance.now() - start}ms`);
    }

    render() {
        // ObjectsController.requestID = window.requestAnimationFrame((currentTime) => {
        //     const currentAudioTime = beatmapFile.audioNode.getCurrentTime();
        //     const timestamp = currentAudioTime;
        //     return this.draw(timestamp);
        // });
        const currentAudioTime = beatmapFile?.audioNode?.getCurrentTime();
        if (currentAudioTime && beatmapFile?.beatmapRenderData?.objectsController)
            beatmapFile.beatmapRenderData.objectsController.draw(currentAudioTime);
    }
}