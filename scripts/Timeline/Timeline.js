class Timeline {
    static obj;
    static hitArea;
    static centerLine;
    static beatLines;
    static APP;
    static WIDTH;
    static HEIGHT;
    static ZOOM_DISTANCE = 200;
    static LOOK_AHEAD = 300;

    static init() {
        Timeline.WIDTH = parseInt(getComputedStyle(document.querySelector(".timeline")).width);
        Timeline.HEIGHT = parseInt(getComputedStyle(document.querySelector(".timeline")).height);

        Timeline.APP = new PIXI.Application({
            width: Timeline.WIDTH,
            height: Timeline.HEIGHT,
            antialias: true,
            autoDensity: true,
            backgroundAlpha: 0,
        });
        // Timeline.APP.renderer = Game.APP.renderer;

        Timeline.obj = new PIXI.Container();
        Timeline.APP.stage.addChild(Timeline.obj);

        Timeline.hitArea = new TimelineDragWindow();
        Timeline.obj.addChild(Timeline.hitArea.obj);

        Timeline.beatLines = new BeatLines();
        Timeline.APP.stage.addChild(Timeline.beatLines.obj);

        Timeline.centerLine = new PIXI.Graphics()
            .lineStyle({
                width: 1,
                color: 0xffffff,
                alignment: 1,
            })
            .moveTo(Timeline.WIDTH / 2 - 1, 0)
            .lineTo(Timeline.WIDTH / 2 - 1, Timeline.HEIGHT)
            .moveTo(Timeline.WIDTH / 2 + 1, 0)
            .lineTo(Timeline.WIDTH / 2 + 1, Timeline.HEIGHT);
        Timeline.APP.stage.addChild(Timeline.centerLine);

        document.querySelector(".timeline").appendChild(Timeline.APP.view);
    }

    static resize() {
        Timeline.WIDTH = parseInt(getComputedStyle(document.querySelector(".timeline")).width);
        Timeline.HEIGHT = parseInt(getComputedStyle(document.querySelector(".timeline")).height);
        Timeline.APP.renderer.resize(Timeline.WIDTH, Timeline.HEIGHT);

        Timeline.APP.stage.removeChild(Timeline.centerLine);
        Timeline.centerLine.clear();
        Timeline.centerLine = new PIXI.Graphics()
            .lineStyle({
                width: 1,
                color: 0xffffff,
                alignment: 1,
            })
            .moveTo(Timeline.WIDTH / 2 - 1, 0)
            .lineTo(Timeline.WIDTH / 2 - 1, Timeline.HEIGHT)
            .moveTo(Timeline.WIDTH / 2 + 1, 0)
            .lineTo(Timeline.WIDTH / 2 + 1, Timeline.HEIGHT);
        Timeline.APP.stage.addChild(Timeline.centerLine);

        Timeline.hitArea.clear().beginFill(0xffffff, 0.01).drawRect(0, 0, Timeline.WIDTH, Timeline.HEIGHT);
    }

    static draw(timestamp) {
        if (!beatmapFile?.beatmapRenderData?.objectsController.objectsList) return;
        Timeline.beatLines.draw(timestamp);

        const objList = beatmapFile.beatmapRenderData.objectsController.objectsList;

        const range = (Timeline.WIDTH / 2 / Timeline.ZOOM_DISTANCE) * 500 + Timeline.LOOK_AHEAD;

        const drawList = [];
        const compareFunc = (element, value) => {
            if (element.obj.endTime < value - range) return -1;
            if (element.obj.time > value + range) return 1;
            return 0;
        };
        const foundIndex = binarySearch(objList, timestamp, compareFunc);

        if (foundIndex !== -1) {
            let start = foundIndex - 1;
            let end = foundIndex + 1;

            while (start >= 0 && compareFunc(objList[start], timestamp) === 0) {
                drawList.push(objList[start]);
                start--;
            }

            drawList.reverse();
            drawList.push(objList[foundIndex]);

            while (end <= objList.length - 1 && compareFunc(objList[end], timestamp) === 0) {
                drawList.push(objList[end]);
                end++;
            }
        }

        Timeline.obj.removeChildren();
        Timeline.obj.addChild(Timeline.hitArea.obj);
        drawList.toReversed().forEach((o) => {
            if (!o.timelineObject) return;
            o.timelineObject.addSelfToContainer(Timeline.obj);
            o.timelineObject.draw(timestamp);
        });
    }
}
