class OrderFlowSoundEngine {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.isSupported = typeof window !== "undefined" && (window.AudioContext || window.webkitAudioContext);
    }

    ensureContext() {
        if (!this.isSupported) return null;
        if (this.audioContext) return this.audioContext;

        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        this.audioContext = new AudioContextClass();
        this.masterGain = this.audioContext.createGain();
        this.masterGain.gain.value = 0.75;
        this.masterGain.connect(this.audioContext.destination);

        return this.audioContext;
    }

    async unlock() {
        const context = this.ensureContext();
        if (!context) return false;

        if (context.state === "suspended") {
            await context.resume();
        }

        return context.state === "running";
    }

    async test() {
        const unlocked = await this.unlock();
        if (!unlocked) return false;

        this.playSequence({
            frequencies: [660, 880, 1100],
            stepDuration: 0.08,
            volume: 0.18,
            type: "triangle",
            now: this.audioContext.currentTime,
        });

        return true;
    }

    createNoiseBuffer() {
        if (!this.audioContext) return null;

        const bufferSize = Math.max(1, Math.floor(this.audioContext.sampleRate * 0.04));
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        return buffer;
    }

    playCue({ type, strength = 1 }) {
        const context = this.ensureContext();
        if (!context || context.state !== "running" || !this.masterGain) return;

        const now = context.currentTime;
        const level = Math.min(Math.max(Number(strength) || 1, 1), 3);
        const gainScale = { 1: 0.7, 2: 1, 3: 1.3 }[level];

        switch (type) {
            case "price_step_up":
                this.playTradeBuyFamily({ flavor: "step", gainScale, now });
                break;
            case "price_step_down":
                this.playTradeSellFamily({ flavor: "step", gainScale, now });
                break;
            case "large_trade_buy":
                this.playTradeBuyFamily({ flavor: "large", gainScale, now });
                break;
            case "large_trade_sell":
                this.playTradeSellFamily({ flavor: "large", gainScale, now });
                break;
            case "burst_buy":
                this.playTradeBuyFamily({ flavor: "burst", gainScale, now });
                break;
            case "burst_sell":
                this.playTradeSellFamily({ flavor: "burst", gainScale, now });
                break;
            case "pace_buy":
                this.playTradeBuyFamily({ flavor: "pace", gainScale, now });
                break;
            case "pace_buy_fast":
                this.playTradeBuyFamily({ flavor: "pace_fast", gainScale, now });
                break;
            case "pace_sell":
                this.playTradeSellFamily({ flavor: "pace", gainScale, now });
                break;
            case "pace_sell_fast":
                this.playTradeSellFamily({ flavor: "pace_fast", gainScale, now });
                break;
            case "pace_down":
                this.playTradeNeutralFamily({ gainScale, now });
                break;
            default:
                this.playTone({ frequency: 820, duration: 0.06, volume: 0.08 * gainScale, type: "sine", now });
                break;
        }
    }

    playDepthCue({ type, strength = 1 }) {
        const context = this.ensureContext();
        if (!context || context.state !== "running" || !this.masterGain) return;

        const now = context.currentTime;
        const level = Math.min(Math.max(Number(strength) || 1, 1), 3);
        const gainScale = { 1: 0.55, 2: 0.8, 3: 1.05 }[level];

        switch (type) {
            case "depth_bid_support":
                this.playDepthBuyFamily({ flavor: "support", gainScale, now });
                break;
            case "depth_ask_pressure":
                this.playDepthSellFamily({ flavor: "pressure", gainScale, now });
                break;
            case "depth_pull_bid":
                this.playDepthSellFamily({ flavor: "pull_bid", gainScale, now });
                break;
            case "depth_pull_ask":
                this.playDepthBuyFamily({ flavor: "pull_ask", gainScale, now });
                break;
            default:
                console.warn("[OrderFlowSoundEngine] Unmapped depth cue type", { type, strength });
                this.playTone({
                    frequency: 460,
                    duration: 0.075,
                    volume: 0.055 * gainScale,
                    type: "sine",
                    now,
                });
                break;
        }
    }

    playTradeBuyFamily({ flavor, gainScale, now }) {
        switch (flavor) {
            case "step":
                this.playTone({ frequency: 980, duration: 0.055, volume: 0.07 * gainScale, type: "sine", now });
                break;
            case "large":
                this.playTone({ frequency: 1480, duration: 0.11, volume: 0.11 * gainScale, type: "square", now });
                break;
            case "burst":
                this.playSequence({
                    frequencies: [740, 1080, 1440],
                    stepDuration: 0.048,
                    volume: 0.082 * gainScale,
                    type: "triangle",
                    now,
                });
                break;
            case "pace":
                this.playTone({ frequency: 700, duration: 0.075, volume: 0.07 * gainScale, type: "triangle", now });
                break;
            case "pace_fast":
                this.playSequence({
                    frequencies: [900, 1260, 900],
                    stepDuration: 0.03,
                    volume: 0.08 * gainScale,
                    type: "square",
                    now,
                });
                break;
            default:
                this.playTone({ frequency: 900, duration: 0.06, volume: 0.07 * gainScale, type: "sine", now });
                break;
        }
    }

    playTradeSellFamily({ flavor, gainScale, now }) {
        switch (flavor) {
            case "step":
                this.playTone({ frequency: 380, duration: 0.065, volume: 0.075 * gainScale, type: "sine", now });
                break;
            case "large":
                this.playTone({ frequency: 170, duration: 0.13, volume: 0.12 * gainScale, type: "square", now });
                break;
            case "burst":
                this.playSequence({
                    frequencies: [500, 300, 170],
                    stepDuration: 0.055,
                    volume: 0.09 * gainScale,
                    type: "triangle",
                    now,
                });
                break;
            case "pace":
                this.playTone({ frequency: 240, duration: 0.085, volume: 0.075 * gainScale, type: "triangle", now });
                break;
            case "pace_fast":
                this.playSequence({
                    frequencies: [340, 240],
                    stepDuration: 0.045,
                    volume: 0.072 * gainScale,
                    type: "triangle",
                    now,
                });
                break;
            default:
                this.playTone({ frequency: 320, duration: 0.07, volume: 0.075 * gainScale, type: "sine", now });
                break;
        }
    }

    playTradeNeutralFamily({ gainScale, now }) {
        this.playTone({
            frequency: 220,
            duration: 0.11,
            volume: 0.085 * gainScale,
            type: "sawtooth",
            now,
        });
    }

    playDepthBuyFamily({ flavor, gainScale, now }) {
        switch (flavor) {
            case "support":
                this.playSequence({
                    frequencies: [190, 260],
                    stepDuration: 0.055,
                    volume: 0.05 * gainScale,
                    type: "triangle",
                    now,
                });
                break;
            case "pull_ask":
                this.playNoiseBurst({
                    duration: 0.02,
                    volume: 0.07 * gainScale,
                    now,
                    highpass: 2800,
                });
                break;
            default:
                this.playTone({ frequency: 240, duration: 0.08, volume: 0.05 * gainScale, type: "triangle", now });
                break;
        }
    }

    playDepthSellFamily({ flavor, gainScale, now }) {
        switch (flavor) {
            case "pressure":
                this.playTone({
                    frequency: 150,
                    duration: 0.14,
                    volume: 0.07 * gainScale,
                    type: "sawtooth",
                    now,
                });
                break;
            case "pull_bid":
                this.playNoiseBurst({
                    duration: 0.038,
                    volume: 0.075 * gainScale,
                    now,
                    highpass: 900,
                });
                this.playTone({
                    frequency: 160,
                    duration: 0.06,
                    volume: 0.03 * gainScale,
                    type: "sawtooth",
                    now,
                });
                break;
            default:
                this.playTone({ frequency: 180, duration: 0.09, volume: 0.055 * gainScale, type: "triangle", now });
                break;
        }
    }

    playSequence({ frequencies, stepDuration, volume, type, now }) {
        frequencies.forEach((frequency, index) => {
            this.playTone({
                frequency,
                duration: stepDuration,
                volume,
                type,
                now: now + index * stepDuration * 0.8,
            });
        });
    }

    playTone({ frequency, duration, volume, type, now }) {
        if (!this.audioContext || !this.masterGain) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, now);

        gainNode.gain.setValueAtTime(0.0001, now);
        gainNode.gain.exponentialRampToValueAtTime(volume, now + 0.008);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        oscillator.connect(gainNode);
        gainNode.connect(this.masterGain);

        oscillator.start(now);
        oscillator.stop(now + duration + 0.02);
    }

    playNoiseBurst({ duration, volume, now, highpass = 1200 }) {
        if (!this.audioContext || !this.masterGain) return;

        const source = this.audioContext.createBufferSource();
        const gainNode = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();

        source.buffer = this.createNoiseBuffer();
        filter.type = "highpass";
        filter.frequency.setValueAtTime(highpass, now);

        gainNode.gain.setValueAtTime(0.0001, now);
        gainNode.gain.exponentialRampToValueAtTime(volume, now + 0.003);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        source.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.masterGain);

        source.start(now);
        source.stop(now + duration + 0.01);
    }

    cleanup() {
        if (this.masterGain) {
            this.masterGain.disconnect();
            this.masterGain = null;
        }

        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
    }
}

export default OrderFlowSoundEngine;
