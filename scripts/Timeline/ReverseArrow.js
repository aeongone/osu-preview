class TimelineReverseArrow extends TimelineHitCircle {
    hitObject;
    slider;

    constructor(hitObject, slider) {
        super(hitObject);

        this.hitObject = hitObject;
        this.slider = slider;

        this.obj.removeChild(this.numberSprite.obj);

        this.numberSprite = new PIXI.Sprite(Texture.LEGACY.REVERSE_ARROW.arrow.texture);
        this.numberSprite.anchor.set(0.5);

        this.numberSprite.scale.set(1);
        this.obj.addChildAt(this.numberSprite, 2);
    }

    draw(timestamp) {
        super.draw(timestamp, true);

        const colors = sliderAppearance.ignoreSkin ? Skinning.DEFAULT_COLORS : Beatmap.COLORS;
        const idx = sliderAppearance.ignoreSkin ? this.slider.colourIdx : this.slider.colourHaxedIdx;
        this.hitCircle.tint = colors[idx % colors.length];
        
        const skinType = Skinning.SKIN_ENUM[skinning.type];
        const textures = skinType !== "CUSTOM" ? Texture.LEGACY : Texture.CUSTOM[Skinning.SKIN_IDX];

        this.numberSprite.texture = textures.REVERSE_ARROW.arrow.texture;

        this.numberSprite.scale.set(textures.REVERSE_ARROW.arrow.isHD ? 0.5 : 1);
    }
}
