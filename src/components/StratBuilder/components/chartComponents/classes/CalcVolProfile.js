class CalcVolProfile {
    constructor(data) {
        this.data = data;
        console.log("CalcVolProfile");
        this.volProfile = {};
        this.runProfile();
    }
    runProfile() {
        let dailyProfile = {};
        let tickSize = 0.1;
        this.data.forEach((d) => {
            const { open, high, low, close, volume } = d;
            //get the range, and divide by 10, lets put the volume in 10 equal bins, but I do want to somehow favor the close
            const range = Math.ceil(((high - low) % 10) * 10);
            let end = parseFloat(high.toFixed(1));
            let start = parseFloat(low.toFixed(1));
            // console.log({ open, high, low, close, volume, start, end });
            for (let i = 0; i < range; i++) {
                const plusplus = i * tickSize;
                const current = parseFloat((start + plusplus).toFixed(1));
                if (!dailyProfile[current]) {
                    dailyProfile[current] = 0;
                }
                dailyProfile[current] += Math.ceil(volume / range);
            }
        });
        this.volProfile = dailyProfile;
    }
}

export default CalcVolProfile;
