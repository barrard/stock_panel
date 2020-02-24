const enumerate = e => {
  var t = [];
  var n = Object.keys(e);
  for (var r = 0; r < n.length; r++) {
    t[r] = e[n[r]];
  }
  return t;
};

const diff = (e, t) => {
  var n, r;
  r = enumerate(e);
  n = Object.keys(r).map(Math.floor);
  return diffXY(n, r, t);
};
const diffXY = (e, t, n) => {
  if (n > 1) {
    t = diffXY(e, t, n - 1);
    e.pop();
  }
  var r = Object.keys(e);
  var i = Object.keys(t);
  var s = Math.min(r.length - 1, i.length - 1);
  for (var o = 0; o < s; o++) {
    t[o] = (t[i[o + 1]] - t[i[o]]) / (e[r[o + 1]] - e[r[o]]);
  }
  t.pop();
  return t;
};
const integral = (e, t) => {
  var n, r;
  r = enumerate(e);
  n = Object.keys(r).map(Math.floor);
  return integralXY(n, r, t);
};

const integralXY = (e, t, n) => {
  if (n > 1) {
    t = integral(e, t, n - 1);
  }
  var r = Object.keys(e);
  var i = Object.keys(t);
  var s = Math.min(r.length - 1, i.length - 1);
  t[s] = -t[s] * (e[r[s]] - e[r[s - 1]]);
  for (var o = s - 1; o >= 0; o--) {
    t[o] = -t[i[o]] * (e[r[o + 1]] - e[r[o]]) + t[i[o + 1]];
  }
  return t;
};
const extrema = (e, t) => {
  var n, r;
  r = enumerate(e);
  n = Object.keys(r).map(Math.floor);
  var i = extremaXY(n, r, t);
  i.minlist = i.minlist.map(function(t) {
    var n = Math.floor((t[1] + t[0]) / 2);
    return Object.keys(e)[n];
  });
  i.maxlist = i.maxlist.map(function(t) {
    var n = Math.floor((t[1] + t[0]) / 2);
    return Object.keys(e)[n];
  });
  return { minlist: i.minlist, maxlist: i.maxlist };
};
const extremaXY = (e, t, n) => {
  var r, i, s, o, u, a, f, l;
  var c = e => {
    var t = [];
    var n = Object.keys(e);
    for (var r = 0; r < n.length; r++) {
      t[r] = e[n[r]];
    }
    return t;
  };
  t = c(t);
  e = c(e);
  r = t.length;
  i = 0;
  s = t[0];
  o = t[0];
  u = [];
  a = [];
  f = 1;
  if (typeof n == "undefined") {
    n = 0.1;
  }
  while (f < r) {
    if (i == 0) {
      if (!(o - n <= t[f] && t[f] <= s + n)) {
        if (o - n > t[f]) {
          i = -1;
        }
        if (s + n < t[f]) {
          i = 1;
        }
      }
      o = Math.max(o, t[f]);
      s = Math.min(s, t[f]);
    } else {
      if (i == 1) {
        if (o - n <= t[f]) {
          o = Math.max(o, t[f]);
        } else {
          l = f - 1;
          while (t[l] >= o - n) {
            l--;
          }
          u.push([e[l], e[f]]);
          i = -1;
          s = t[f];
        }
      } else {
        if (i == -1) {
          if (s + n >= t[f]) {
            s = Math.min(s, t[f]);
          } else {
            l = f - 1;
            while (t[l] <= s + n) {
              l--;
            }
            a.push([e[l], e[f]]);
            i = 1;
            o = t[f];
          }
        }
      }
    }
    f++;
  }
  return { minlist: a, maxlist: u };
};

function minMax(xArray, yArray, tolerance = 1) {
  //xArray is time, yArray is price
  let minValues = [];
  let maxValues = [];
  let totalLength = yArray.length;
// console.log({xArray, yArray, tolerance})
  yArray.forEach((value, index) => {
    // console.log({index, tolerance})
    if (index - tolerance < 0 || index + tolerance > totalLength) {
      return;
    } else {
      // console.log({index, tolerance})

      let minima = false
      let maxima = false
      let same = false
     //loop from 
      for (let x = index - tolerance ; x <= index + tolerance ; x++){
        if( x === index) continue
        if ( yArray[index] < yArray[x] ) minima = true
        if ( yArray[index] > yArray[x] ) maxima = true
        if ( yArray[index] === yArray[x] ) same = true

        let indexVal = yArray[index]
        let checkVal = yArray[x]
        // console.log({indexVal, checkVal})

      }

        // console.log({
        //   minima, maxima, same
        // })
        if(!minima && maxima ) {
          maxValues.push({x:xArray[index], y:yArray[index]})
        }
        if(minima && !maxima ) {
          minValues.push({x:xArray[index], y:yArray[index]})
        }


      // minValues.push(value);
    }
  });
  return { minValues, maxValues };
}

// y = [ 0,   1,   2,   3,  2,   3.2,   4,   5,   1,   0];
// x = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
export default {
  enumerate,
  diff,
  diffXY,
  integral,
  integralXY,
  extrema,
  extremaXY,
  minMax
};
