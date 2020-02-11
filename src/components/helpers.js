export const avg = vals => {
//   console.log(vals);
  let sum = vals.reduce((a, b) => {
    return b + a;
  }, 0);
//   console.log({ sum });
  return Math.floor(sum / vals.length);
};
