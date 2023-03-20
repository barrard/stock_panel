import { Graphics } from "pixi.js";

//make a line graphic
function TickLine() {
    const priceLineGfx = new Graphics();

    priceLineGfx.lineStyle(1, 0xffffff, 1);
    ticks.forEach((tick, i) => {
        const x = xScaleRef.current(tick.datetime);
        const y = priceScaleRef.current(tick.close);
        if (i === 0) {
            priceLineGfx.moveTo(x, y);
        } else {
            priceLineGfx.lineTo(x, y);
        }
    });
}
