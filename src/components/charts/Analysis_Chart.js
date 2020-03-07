import React from "react";
import ReactDOM from "react-dom";

import { connect } from "react-redux";
import { toastr } from "react-redux-toastr";
import { Link, withRouter } from "react-router-dom";
import { add_MA_data_action } from "../../redux/actions/stock_actions.js";
import {
  set_x_offest,
  set_canvas_dimentions,
  set_data_view_params
} from "../../redux/actions/Chart_Analysis_actions.js";

class Canvas_Chart extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      last_candle_id: null,
      date_marker_timestamp: { prev_year: "", prev_month: "", prev_day: "" },

      months: [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec"
      ]
    };
    this.narrow_bars = this.narrow_bars.bind(this);
    this.wider_bars = this.wider_bars.bind(this);
    this.listen_for_chart_drag = this.listen_for_chart_drag.bind(this);
    this.draw_cross_hair = this.draw_cross_hair.bind(this);
    this.move_to_chart_begining = this.move_to_chart_begining.bind(this);

    this.move_chart_forward = this.move_chart_forward.bind(this);
    this.move_chart_backward = this.move_chart_backward.bind(this);
  }
  componentWillUnmount() {
    this._ismounted = false;
  }
  componentDidMount() {
    this._ismounted = true;

    // console.log("canvas mounted");
    this.make_canvas_full_screen();
    window.addEventListener("resize", this.make_canvas_full_screen.bind(this));

    this.calc_MA_data();
  }
  componentDidUpdate(prevProps) {
    let { meta, canvas_id, container_width, Chart_Analysis } = this.props;
    let { x_offset } = Chart_Analysis;
    // console.log("----------------componentDidUpdate=====================");
    // console.log(prevProps.Chart_Analysis.x_offset);
    // console.log(this.props.Chart_Analysis.x_offset);
    if (!prevProps.meta.is_loading && meta.is_loading) {
      // console.log("new chart data is being loaded");
      this.run_spinner();
    } else if (
      !prevProps.meta.is_loading &&
      !meta.is_loading &&
      canvas_id != prevProps.canvas_id
    ) {
      /* must have loaded a new chart?  Draw chart */
      // console.log("new  chart selected form chache");
      this.calc_MA_data();
    } else if (prevProps.meta.is_loading && !meta.is_loading) {
      // console.log("Done loading new data, draw chart righ meow");
      this.draw_chart();
    } else if (prevProps.container_width != container_width) {
      // console.log("container_width changed");
      this.make_canvas_full_screen();
    } else {
      // console.log("draw the fucking chart");

      this.draw_chart();

      // console.log("render what is happeneing");
    }
  }
  calc_MA_data() {
    let { search_symbol, charts } = this.props.stock_data;
    let chart_data = charts[search_symbol];
    if (!chart_data) return setTimeout(() => this.calc_MA_data(), 500);
    let chart_data_length = chart_data.length;
    let MA_data = add_MA_data_to_model(chart_data);
    // console.log(MA_data);
    this.props.Chart_Analysis.MA_data = MA_data;
    this.props.Chart_Analysis.chart_data_length = chart_data_length;
    /* max x-ofset is needed for stuff */
    let {
      candle_width,
      space_between_bars,
      x_offset,
      canvas_width
    } = this.props.Chart_Analysis;
    let max_x_offset = chart_data_length * (candle_width + space_between_bars);
    this.props.Chart_Analysis.max_x_offset = max_x_offset;

    let bar_size = candle_width + space_between_bars;

    let bar_offset = Math.floor(x_offset / bar_size);
    let candles_per_view = Math.floor(canvas_width / bar_size);

    let end = chart_data_length - bar_offset;
    let start = end - candles_per_view;

    this.props.Chart_Analysis.data_view_params.start = start;
    this.props.Chart_Analysis.data_view_params.end = end;

    setTimeout(() => this.draw_chart(), 100);
  }
  make_canvas_full_screen() {
    if (typeof window !== "undefined") {
      if (!this._ismounted) return;
      // console.log(this);
      let dom_node = ReactDOM.findDOMNode(this);
      let { canvas_id } = this.props;
      let canvas_width = dom_node.parentElement.clientWidth - 30; //15px padding left/right
      let canvas_height = dom_node.parentElement.clientHeight - 15;
      // console.log({ canvas_height, canvas_width });
      this.props.dispatch(set_canvas_dimentions(canvas_width, canvas_height));
      // this.props.Chart_Analysis.canvas_width = canvas_width;
      // this.props.Chart_Analysis.canvas_height = canvas_height;
      setTimeout(() => {
        // console.log(this.props);
        let canvas = document.getElementById(this.props.canvas_id);
        let crosshair_overlay = document.getElementById(
          `${this.props.canvas_id}_crosshair_overlay`
        );
        if (!crosshair_overlay)
          return setTimeout(() => this.make_canvas_full_screen(), 0);
        let scrollY_offset = window.scrollY;
        // console.log({scrollY_offset})
        let overlay_offset = crosshair_overlay.getBoundingClientRect();

        this.props.Chart_Analysis.scrollY_offset = scrollY_offset;
        this.props.Chart_Analysis.overlay_offset = overlay_offset;
        this.props.Chart_Analysis.canvas = canvas;
        this.props.Chart_Analysis.crosshair_overlay = crosshair_overlay;
        // this.setState({
        //   scrollY_offset,
        //   overlay_offset,
        //   canvas,
        //   crosshair_overlay
        // });
        this.run_spinner();
        // console.log("does this run?");
        // console.log(this);
      }, 0);
    }
  }
  run_spinner() {
    let { search_symbol, charts } = this.props.stock_data;
    let chart_data = charts[search_symbol];
    if (!chart_data) return;
    let { canvas_id } = this.props;
    var canvas = document.getElementById(canvas_id);
    var context = canvas.getContext("2d");
    var start = new Date();
    var lines = 16,
      cW = context.canvas.width,
      cH = context.canvas.height;

    var draw_spinner = () => {
      if (!this.props.meta.is_loading) {
        clearInterval(spinner_timmer);
        this.props.Chart_Analysis.spinner_timmer = false;
     

        return this.calc_MA_data();
      }
      var rotation = parseInt(((new Date() - start) / 1000) * lines) / lines;
      context.save();
      context.clearRect(0, 0, cW, cH);
      context.translate(cW / 2, cH / 2);
      context.rotate(Math.PI * 2 * rotation);
      for (var i = 0; i < lines; i++) {
        context.beginPath();
        context.rotate((Math.PI * 2) / lines);
        context.moveTo(cW / 10, 0);
        context.lineTo(cW / 4, 0);
        context.lineWidth = cW / 30;
        context.strokeStyle = "rgba(0, 0, 0," + i / lines + ")";
        context.stroke();
      }
      context.restore();
    };
    let spinner_timmer = setInterval(draw_spinner, 1000 / 30);
  }

  listen_for_chart_drag(e) {
    let { search_symbol, charts } = this.props.stock_data;
    let chart_data = charts[search_symbol];
    if (!chart_data) return;
    let {
      x_offset,
      candle_width,
      space_between_bars,
      canvas,
      chart_data_length
    } = this.props.Chart_Analysis;
    // if(!prev_clientX)return this.setState({prev_clientX:e.clientX})
    let bar_size = candle_width + space_between_bars;
    let bar_count = Math.floor(canvas.width / bar_size);
    // console.log({chart_data_length, bar_size, bar_count, bar_size});
    let max_x_offset = chart_data_length * bar_size - bar_count * bar_size;

    // console.log({ x_offset });
    e.preventDefault();
    x_offset = x_offset + e.movementX;
    //  console.log({x_offset})
    if (x_offset < -100) x_offset = -100;
    if (x_offset > max_x_offset) x_offset = max_x_offset;
    // console.log({ x_offset, max_x_offset });
    // console.log(this.props.Chart_Analysis.LR_results)
    /* whats candle ID range is eing shown? */

    // console.log(canvas.width)
    let bar_offset = Math.floor(x_offset / bar_size);

    let candles_per_view = Math.floor(canvas.width / bar_size);

    let candle_id = Math.floor(
      chart_data_length - bar_offset - candles_per_view
    );
    if (this.state.last_candle_id != candle_id) {

      this.state.last_candle_id = candle_id;
      let { last_candle_id } = this.state;
      // console.log({
      //   last_candle_id,
      //   candle_id,
      //   chart_data_length,
      //   bar_offset,
      //   candles_per_view
      // });
      /* chart_data */
      let end = chart_data_length - bar_offset;
      let start = end - candles_per_view;
      // console.log({start, end})
      // let view_bar_data = chart_data.slice(start, end)
      // console.log(view_bar_data)
      /* dispatch this to the store */
      this.props.Chart_Analysis.data_view_params.start = start;
      this.props.Chart_Analysis.data_view_params.end = end;

      // this.props.dispatch(set_data_view_params(start, end))
    }

    // console.log({candle_count, bar_offset})

    this.props.Chart_Analysis.x_offset = x_offset;
    this.draw_chart();
  }

  render_canvas(canvas_id, canvas_width, canvas_height) {
    // console.log("CANVAS RENDERED");
    return (
      <>
        <canvas
          onMouseDown={() => (this.props.Chart_Analysis.mouseDown = true)}
          onTouchStart={() => (this.props.Chart_Analysis.mouseDown = true)}
          onMouseUp={() => (this.props.Chart_Analysis.mouseDown = false)}
          onTouchEnd={() => (this.props.Chart_Analysis.mouseDown = false)}
          onMouseMove={this.draw_cross_hair}
          onTouchMove={this.draw_cross_hair}
          className="crosshair_overlay absolute "
          id={`${canvas_id}_crosshair_overlay`}
          width={canvas_width}
          height={canvas_height}
        />
        <canvas
          className="chart_canvas "
          id={canvas_id}
          width={canvas_width}
          height={canvas_height}
        />
      </>
    );
  }
  draw_cross_hair(e) {
    let {
      mouseDown,
      vol_canvas_share,
      overlay_offset,
      scrollY_offset,
      crosshair_overlay,
      min_price,
      pennies_per_pixel,
      candle_width,
      space_between_bars,
      chart_style,
      x_offset,
      max_x_offset,
      chart_data_length,
      canvas_width
    } = this.props.Chart_Analysis;
    // console.log(window.scrollY);
    if (mouseDown) {
      let x_hair_ctx = crosshair_overlay.getContext("2d");

      x_hair_ctx.clearRect(
        0,
        0,
        crosshair_overlay.width,
        crosshair_overlay.height
      );

      return this.listen_for_chart_drag(e);
    }
    let pos = {
      left: e.pageX - overlay_offset.left,
      top: e.pageY - overlay_offset.top - scrollY_offset
    };
    let { left, top } = pos;
    let canvas = crosshair_overlay;
    if (!canvas) return;
    const chart_height = canvas.height * (1 - vol_canvas_share);

    let price_label = parseFloat(
      min_price + ((chart_height - top) * pennies_per_pixel) / 100
    ).toFixed(2);

    let x_hair_ctx = canvas.getContext("2d");

    x_hair_ctx.clearRect(0, 0, canvas.width, canvas.height);

    //horizontal crosshair line on chart
    x_hair_ctx.beginPath();
    x_hair_ctx.moveTo(0, top);
    x_hair_ctx.lineTo(canvas.width, top);
    x_hair_ctx.stroke();
    //vertical crosshair line on chart
    x_hair_ctx.beginPath();
    x_hair_ctx.moveTo(left, 0);
    x_hair_ctx.lineTo(left, canvas.height);
    x_hair_ctx.stroke();
    /* flip label near edges */
    let label_x_pos, label_y_pos;
    if (left + 50 > canvas.width) label_x_pos = left - 50;
    else label_x_pos = left + 10;
    if (top + 50 > canvas.height) label_y_pos = top - 20;
    else label_y_pos = top + 15;
    let bar_size = candle_width + space_between_bars;
    let bar_count = Math.floor(canvas.width / bar_size);
    let bar_offset = Math.floor(x_offset / bar_size);

    let candles_per_view = Math.floor(canvas_width / bar_size);
    let mouse_over_bar_id = Math.floor(left / bar_size);
    // let candle_id = Math.floor(
    //   Math.floor(left / bar_size) +
    //   (chart_data_length - bar_offset - (canvas.width / bar_size))
    //   );
    let candle_id =
      chart_data_length - (bar_offset + candles_per_view) + mouse_over_bar_id;
    // console.log({ left });
    // console.log({candle_id, mouse_over_bar_id})
    /* Crosshair price-y  */
    write_label(
      price_label,
      chart_style,
      14,
      x_hair_ctx,
      label_x_pos,
      label_y_pos
    );

    let bar_data;
    let { search_symbol, charts } = this.props.stock_data;
    let chart_data = charts[search_symbol];
    if (chart_data) bar_data = chart_data[candle_id];
    if (bar_data) {

      let pixels_per_penny = this.props.Chart_Analysis.pixels_per_penny;
      let pixels_per_vol = this.props.Chart_Analysis.pixels_per_vol;
      const candle_position = Math.floor(left / bar_size) * bar_size;

      let position = mouse_over_bar_id * bar_size;
      let max_x_offset =
        chart_data_length * (candle_width + space_between_bars) -
        candles_per_view * bar_size;

      // console.log({candles_per_view, position, candle_id})
      // console.log({max_x_offset,x_offset, bar_offset, bar_size, canvas_width })
      let width_multiplier = bar_size > 20 ? 1.5 : 2;
      let width_divisor = bar_size > 4 ? 3.7 : 2;
      /* Bar being hovered over */
      this.draw_candle(
        x_hair_ctx,
        position - bar_size / width_divisor,
        bar_data,
        candle_width * width_multiplier,
        pixels_per_penny,
        pixels_per_vol
      );

      /* The date at the bottom of the crosshair */
      if (bar_data.t) {
        write_label(
          new Date(bar_data.t * 1000).toLocaleDateString('en-US'),
          chart_style,
          14,
          x_hair_ctx,
          left,
          canvas.height
        );
      }

      /* info box shown right at the crosshair */
      var info_box_width = 80;
      var info_box_height = 80;
      /* Need to figure out widest label first */
      let info_label_data;
      if (bar_data.t) {
        info_label_data = ["t", "o", "h", "l", "c"];
        // console.log(bar_data)
      } 
      info_label_data.forEach((label_data, index) => {
        let label = bar_data[label_data];
        // console.log({ label, label_data });
        if (label_data == "t")
          label = new Date(bar_data[label_data]*1000).toLocaleDateString('en-US');
          // console.log({ label });

          if (!isNaN(label)) label = `${label_data}: ${label.toFixed(2)}`;
        // console.log({ label });
        let label_width = x_hair_ctx.measureText(label).width;
        // console.log({ label_width });
        /* Adjust label_infor_box width accordingly */
        if (label_width > info_box_width) info_box_width = label_width + 13;
      });

      x_hair_ctx.strokeStyle = chart_style == "light" ? "black" : "white";
      /* flip label near edges */
      let info_box_x_pos, info_box_y_pos;
      if (left < info_box_width) info_box_x_pos = left;
      else info_box_x_pos = left - info_box_width;
      if (top < 100) info_box_y_pos = top;
      else info_box_y_pos = top - info_box_height;

      /* Bar data labels inside info box */

      info_label_data.forEach((label_data, index) => {
        let label;
        if (label_data == "t") {

          label = new Date(bar_data[label_data]*1000).toLocaleDateString('en-US')
        } else {
          label = bar_data[label_data];
        }
        if (!isNaN(label)) label = `${label_data}: ${label.toFixed(2)}`;

        write_label(
          label,
          chart_style,
          14,
          x_hair_ctx,
          info_box_x_pos + 3,
          info_box_y_pos + 15 * (index + 1)
        );
      });

      x_hair_ctx.strokeRect(
        info_box_x_pos,
        info_box_y_pos,
        info_box_width,
        info_box_height
      );
    }
  }

  draw_chart() {
    let { search_symbol, charts } = this.props.stock_data;
    // console.log(this.props)
    let chart_data = charts[search_symbol]; 
    if(!chart_data)return console.log('No chart data')
   
    const {
      chart_style,
      canvas,
      vol_canvas_share,
      candle_width,
      space_between_bars,
      x_offset,
      chart_data_length
    } = this.props.Chart_Analysis;

    if (!canvas) {
      // console.log("no canvas");
      return; /* setTimeout(()=> this.draw_chart() ,10) */
    }
    // console.log("DRAW CART");
    let context = canvas.getContext("2d", false);
    clear_canvas(context, chart_style);
    /* Figure out how many bars are going to fin in the visible space */
    let candle_count = Math.floor(
      canvas.width / (candle_width + space_between_bars)
    );

    // let candle_count = Math.floor(canvas.witdh /(space_between_bars + candle_width))
    // console.log({ chart_data, candle_count });
    let bar_offset = Math.floor(x_offset / (candle_width + space_between_bars));
    if (bar_offset <= 0) {
      chart_data = chart_data.slice((candle_count + bar_offset) * -1);
    } else {
      let end_of_data = chart_data_length - bar_offset - candle_count;
      if (end_of_data < 0) end_of_data = 0;
      if (bar_offset + candle_count > chart_data_length)
        bar_offset = Math.floor(chart_data_length - candle_count);

      chart_data = chart_data.slice(end_of_data, bar_offset * -1);
    }
    // console.log({ chart_data });

    /* get min and max values */
    let { min_price, max_price, max_vol } = this.get_min_max(chart_data);
    // let min_price = this.get_min_price(chart_data);
    // let max_price = this.get_max_price(chart_data);
    // let max_vol = this.get_max_vol(chart_data);
    // console.log({ min_price, max_price, max_vol });

    /* price / Time markers */
    let date_marker_position = Math.floor(chart_data.length / 10);

    const volume_canvas_height = canvas.height * vol_canvas_share; //volume will be lower 20% (should be adjustable)
    const chart_height = canvas.height * (1 - vol_canvas_share);
    let number_of_pennies = (max_price - min_price) * 100;
    let pennies_per_pixel = (number_of_pennies / chart_height).toFixed(3);
    let pixels_per_penny = (chart_height / number_of_pennies).toFixed(3);
    let pixels_per_vol = (volume_canvas_height / max_vol).toFixed(10);

    // console.log({
    //   number_of_pennies,
    //   pennies_per_pixel,
    //   pixels_per_penny,
    //   pixels_per_vol
    // });

    this.props.Chart_Analysis.volume_canvas_height = volume_canvas_height;
    this.props.Chart_Analysis.chart_height = chart_height;
    this.props.Chart_Analysis.min_price = min_price;
    this.props.Chart_Analysis.max_price = max_price;
    this.props.Chart_Analysis.max_vol = max_vol;
    this.props.Chart_Analysis.number_of_pennies = number_of_pennies;
    this.props.Chart_Analysis.pennies_per_pixel = pennies_per_pixel;
    this.props.Chart_Analysis.pixels_per_penny = pixels_per_penny;
    this.props.Chart_Analysis.pixels_per_vol = pixels_per_vol;

    /* wait for setSate */
    // setTimeout(() => {
    this.draw_price_markers(context, min_price, max_price);
    let { MA_20, MA_50, MA_200 } = this.props.Chart_Analysis.MA_data;
    // console.log(this.props);
    if (!MA_20) return //console.log("AHAHAAHAHA NOO MAAAAA");
    this.draw_MA(MA_20, "green", context, bar_offset);
    this.draw_MA(MA_50, "blue", context, bar_offset);
    this.draw_MA(MA_200, "red", context, bar_offset);

    chart_data.forEach((data, count) => {
      const candle_position = count * candle_width + space_between_bars * count;

      this.draw_candle(
        context,
        candle_position,
        data,
        candle_width,
        pixels_per_penny,
        pixels_per_vol
      );
    });
    chart_data.forEach((data, count) => {
      const candle_position = count * candle_width + space_between_bars * count;

      if (count % date_marker_position == 0)
        this.draw_date_marker(candle_position, candle_width, data, canvas);
    });
  }
  /* Vertical lines on the chart */
  draw_date_marker(candle_position, candle_width, data, canvas) {
    // console.log('Draw Date Marker')
    let date_time;
    if (data.t) date_time = new Date(data.t *1000).toLocaleDateString('en-US');
    // return
    // console.log(canvas)
    let context = canvas.getContext("2d");
    // console.log(date_time)
    let date_line_color =
      this.props.Chart_Analysis.chart_style == "light" ? "grey" : "white";
    context.beginPath();
    context.setLineDash([5, 45]);
    context.strokeStyle = date_line_color;

    context.moveTo(candle_position + candle_width / 2, 0);
    context.lineTo(candle_position + candle_width / 2, canvas.height);
    context.stroke();
    context.font = "bold 10px Arial";
    let text = context.measureText(date_time);
    // console.log(text.width)
    write_label(
      date_time,
      this.props.Chart_Analysis.chart_style,
      14,
      context,
      candle_position - text.width / 2,
      canvas.height
    );
    context.setLineDash([]);
  }
  draw_price_markers(context, min, max) {
    let { chart_height, chart_style } = this.props.Chart_Analysis;
    let canvas = context.canvas;
    let range = max - min;

    let intervals = parseFloat(range / 5).toFixed(4);
    let marker_count = 0;
    context.strokeStyle = `rgb(222, 222, 222)`;

    let price_marker_position = Math.floor(chart_height / 5);
    // console.log(price_marker_position)
    // console.log({number_of_pennies, price_marker_position, pixels_per_penny})
    for (let x = 0; x < chart_height; x++) {
      if (x % price_marker_position == 0) {
        context.beginPath();
        context.moveTo(0, chart_height - x);
        context.lineTo(canvas.width, chart_height - x);
        context.stroke();
        let price_label = parseFloat(min + marker_count * intervals).toFixed(2);

        let text = context.measureText(price_label);
        write_label(
          price_label,
          chart_style,
          10,
          context,
          canvas.width - text.width,
          chart_height - x
        );
        marker_count++;
      }
    }
  }
  draw_volume(
    candle_position,
    max_vol,
    data,
    candle_width,
    ctx,
    pixels_per_vol
  ) {
    let { canvas } = ctx;

    ctx.fillRect(
      candle_position,
      canvas.height - data.volume * pixels_per_vol,
      candle_width,
      data.volume * pixels_per_vol
    );
  }


  get_min_max(data) {
    let max_price = 0; //low number that is lower than any high
    let min_price = 10000000; //some big number that is larger than any lows

    let max_vol = 0; //some big number that is larger than any lows
    data.forEach(data_point => {
      if (data_point.h > max_price) {
        max_price = data_point.h;
      }
      if (data_point.l < min_price && data_point.l > 0) {
        min_price = data_point.l;
      }
      if (data_point.volume > max_vol) {
        max_vol = data_point.volume;
      }
    });
    return { max_price, min_price, max_vol };
  }
  // get_min_price(data) {
  //   return data.reduce((min, p) => (p.l < min ? p.l : min), data[0].l);
  // }
  // get_max_price(data) {
  //   return data.reduce((max, p) => (p.h > max ? p.h : max), data[0].h);
  // }
  // get_max_vol(data) {
  //   return data.reduce(
  //     (max, p) => (p.volume > max ? p.volume : max),
  //     data[0].volume
  //   );
  // }
  // draw_candle(1, 100, 0, {low:0, high:80, open:75, close:80})
  draw_candle(
    context,
    candle_position,
    candle_data,
    candle_width,
    pixels_per_penny,
    pixels_per_vol
  ) {
    var { max_price, max_vol } = this.props.Chart_Analysis;

    // console.log({ pennies_per_pixel })
    // console.log({ pixels_per_penny })

    // const total_range_in_pennies = canvas.height*pennies_per_pixel
    // console.log({total_range_in_pennies})
    // console.log({ candle_data})
    // console.log((min_max.max - candle_data.h) * 100 * pixels_per_penny)
    // console.log((min_max.max - candle_data.l) * 100 * pixels_per_penny)
    // console.log(candle_position + (candle_width / 2))
    context.beginPath();
    context.setLineDash([]);
    if (candle_data.o > candle_data.c) context.strokeStyle = "red";
    if (candle_data.o < candle_data.c) context.strokeStyle = "green";
    if (candle_data.o == candle_data.c) context.strokeStyle = "gray";

    context.moveTo(
      candle_position + candle_width / 2,
      (max_price - candle_data.h) * 100 * pixels_per_penny
    );
    context.lineTo(
      candle_position + candle_width / 2,
      (max_price - candle_data.l) * 100 * pixels_per_penny
    );
    context.stroke();

    //candle rect
    var candle_height;
    if (candle_data.o > candle_data.c) {
      // console.log('red')
      context.fillStyle = "red";
      context.strokeStyle = "red";
      candle_height =
        (candle_data.o - candle_data.c) * 100 * pixels_per_penny;
    } else if (candle_data.o == candle_data.c) {
      // console.log('black')
      context.fillStyle = "black";
      context.strokeStyle = "black";
      candle_height = 1;
    } else {
      // console.log('green')
      context.fillStyle = "green";
      context.strokeStyle = "green";
      candle_height =
        (candle_data.c - candle_data.o) * 100 * pixels_per_penny * -1;
    }
    this.draw_volume(
      candle_position,
      max_vol,
      candle_data,
      candle_width,
      context,
      pixels_per_vol
    );

    context.fillRect(
      candle_position,
      (max_price - candle_data.o) * 100 * pixels_per_penny,
      candle_width,
      candle_height
    );
  }

  draw_MA(data, color, context, bar_offset) {
    let { canvas } = context;

    let {
      candle_width,
      space_between_bars,
      max_price,
      pixels_per_penny,
      x_offset,
      chart_data_length
    } = this.props.Chart_Analysis;

    let symbol = this.props.chart_id;

    let width = canvas.width;
    let candle_count = width / (candle_width + space_between_bars);
    // console.log({ candle_count });
    let MA_data = data;
    let data_length = chart_data_length;
    let new_data;
    // let bar_offset = x_offset / (candle_width+space_between_bars)
    // console.log({bar_offset})
    if (bar_offset <= 0) {
      new_data = MA_data.slice((candle_count + bar_offset) * -1);
    } else {
      let end_of_data = data_length - bar_offset - candle_count;
      if (end_of_data < 0) end_of_data = 0;
      if (bar_offset + candle_count > data_length)
        bar_offset = data_length - candle_count;

      new_data = MA_data.slice(end_of_data, bar_offset * -1);
    }
    // console.log({ new_data, MA_data });

    context.strokeStyle = `${color}`;
    new_data.forEach((d, count) => {
      if (!new_data[count - 1]) return;
      const candle_position = count * candle_width + space_between_bars * count;
      const prev_candle_position =
        (count - 1) * candle_width + space_between_bars * (count - 1);
      context.beginPath();
      let move_to_x = prev_candle_position + candle_width / 2;

      let move_to_y =
        (max_price - new_data[count - 1].c) * 100 * pixels_per_penny;
      context.moveTo(move_to_x, move_to_y);
      let line_to_x = candle_position + candle_width / 2;
      let line_to_y = (max_price - d.c) * 100 * pixels_per_penny;
      context.lineTo(line_to_x, line_to_y);

      context.stroke();
    });
  }

  narrow_bars() {
    console.log("narrow bars");
    var {
      candle_width,
      chart_data_length,
      x_offset,
      candle_width,
      space_between_bars,
      canvas
    } = this.props.Chart_Analysis;
    candle_width -= 1;
    console.log({ candle_width });
    let bar_size = candle_width + space_between_bars;
    let bar_offset = Math.floor(x_offset / bar_size);
    let candles_per_view = Math.floor(canvas.width / bar_size);

    let end = chart_data_length - bar_offset;
    let start = end - candles_per_view;
    this.props.Chart_Analysis.data_view_params.start = start;
    this.props.Chart_Analysis.data_view_params.end = end;

    this.props.Chart_Analysis.candle_width = candle_width;
    setTimeout(() => this.draw_chart(), 0);
  }
  wider_bars() {
    console.log("wider_bars");
    var { candle_width,      chart_data_length,
      x_offset,
      candle_width,
      space_between_bars,
      canvas } = this.props.Chart_Analysis;
    let bar_size = candle_width + space_between_bars;
    let bar_offset = Math.floor(x_offset / bar_size);
    let candles_per_view = Math.floor(canvas.width / bar_size);

    let end = chart_data_length - bar_offset;
    let start = end - candles_per_view;
    this.props.Chart_Analysis.data_view_params.start = start;
    this.props.Chart_Analysis.data_view_params.end = end;
    candle_width += 1;
    console.log({ candle_width });

    this.props.Chart_Analysis.candle_width = candle_width;
    setTimeout(() => this.draw_chart(), 0);
  }
  move_chart_forward() {
    let {
      x_offset,
      canvas_width,
      candle_width,
      space_between_bars
    } = this.props.Chart_Analysis;
    let bars_in_view = canvas_width / (candle_width + space_between_bars);
    this.props.Chart_Analysis.x_offset -= bars_in_view;
    setTimeout(() => this.draw_chart(), 0);
  }
  move_chart_backward() {
    let {
      x_offset,
      canvas_width,
      candle_width,
      space_between_bars
    } = this.props.Chart_Analysis;
    let bars_in_view = canvas_width / (candle_width + space_between_bars);
    this.props.Chart_Analysis.x_offset += bars_in_view;
    setTimeout(() => this.draw_chart(), 0);
  }
  move_to_chart_begining() {
    let {
      canvas_width,
      candle_width,
      chart_data_length,
      space_between_bars
    } = this.props.Chart_Analysis;
    let bar_size = candle_width + space_between_bars;
    let data_length = chart_data_length;
    let candle_count = Math.floor(canvas_width / bar_size);
    let new_x_offset = data_length * bar_size - candle_count * bar_size;
    this.props.Chart_Analysis.x_offset = new_x_offset;
    // console.log(this.props)
    // console.log({new_x_offset})
    this.props.dispatch(set_x_offest(new_x_offset));
    // setTimeout(()=> this.draw_chart(),  0)
  }

  render() {
    // console.log(this.props)
    let { canvas_width, canvas_height } = this.props.Chart_Analysis;
    let { canvas_id, chart_data, meta } = this.props;
    let { is_loading } = meta;

    return (
      <div className="vh_30 relative">
        <Chart_Buttons
          beggining={this.move_to_chart_begining}
          toggle_wide={this.props.toggle_wide_mode}
          narrow_bars={this.narrow_bars}
          wider_bars={this.wider_bars}
          forward={this.move_chart_forward}
          backward={this.move_chart_backward}
        />
        {/* Min-height is 30vh */}
        {/* this is here to make it work, dont remove */}
        {canvas_width &&
          canvas_height &&
          this.render_canvas(canvas_id, canvas_width, canvas_height)}
      </div>
    );
  }
}

function mapStateToProps(state) {
  const { stock_data, meta, Chart_Analysis } = state;
  return { stock_data, meta, Chart_Analysis };
}

export default connect(mapStateToProps)(withRouter(Canvas_Chart));

const Chart_Buttons = ({
  beggining,
  toggle_wide,
  narrow_bars,
  wider_bars,
  forward,
  backward
}) => {
  return (
    <div className="  relative z_index_100 ml-1 full-width">
      <button className="btn btn-info left-1em " onClick={beggining}>
        <span className="fa fa-fast-backward" />
      </button>
      <button className="btn btn-info left-3em " onClick={toggle_wide}>
        <span className="fa fa-expand" />
      </button>

      <button className="btn btn-info left-5em " onClick={backward}>
        <span className="fa fa-backward" />
      </button>

      <button className="btn btn-info left-7em" onClick={wider_bars}>
        <span className="fa fa-arrows-alt-h" />
      </button>
      <button className="btn btn-info left-9em" onClick={narrow_bars}>
        <img width="29" src="/imgs/narrow-sm.png" alt="" />
      </button>
      <button className="btn btn-info left-12em " onClick={forward}>
        <span className="fa fa-forward" />
      </button>
    </div>
  );
};

function clear_canvas(context, chart_style) {
  let background_color = chart_style == "light" ? "white" : "black";
  let cW = context.canvas.width,
    cH = context.canvas.height;
  context.clearRect(0, 0, cW, cH);
  context.fillStyle = background_color;
  context.fillRect(0, 0, cW, cH);
}

function write_label(text, chart_style, size, ctx, x, y) {
  /* fill the label background with same as chart style */
  let label_background = chart_style == "light" ? "white" : "black";
  ctx.fillStyle = label_background;
  ctx.font = `bold ${size}px Arial`;
  let label = text;
  let text_width = ctx.measureText(label).width;
  ctx.fillRect(x, y, text_width, -14);
  let text_color = chart_style == "light" ? "black" : "white";
  ctx.fillStyle = text_color;
  ctx.fillText(label, x, y);
}

function add_MA_data_to_model(daily_data) {
  let before_cal = new Date().getTime();
  /* ensure we have data for the symbol*/
  let MA_obj = {
    MA_20: [],
    MA_50: [],
    MA_200: []
  };

  let length = daily_data.length;

  let counter = -1;
  let MA_20 = 20; //minumum MA to calculater, hard coded..
  let MA_50 = 50; //minumum MA to calculater, hard coded..
  let MA_200 = 200; //minumum MA to calculater, hard coded..
  /* Start a loop */
  while (counter < length - MA_20) {
    counter++;
    /* start from the begining of the array */
    let end_counter_20 = MA_20 + counter;
    let end_counter_50 = MA_50 + counter;
    let end_counter_200 = MA_200 + counter;
    /* get the number MA items in array */
    /* 20 */
    if (length >= MA_20) {
      let slice_20 = slice_data(counter, end_counter_20, daily_data);
      let price_MA_data = get_price_type_averages(slice_20);

      MA_obj.MA_20[end_counter_20 - 1] = price_MA_data;
    }
    if (length >= end_counter_50) {
      let slice_50 = slice_data(counter, end_counter_50, daily_data);
      let price_MA_data = get_price_type_averages(slice_50);

      MA_obj.MA_50[end_counter_50 - 1] = price_MA_data;
    }
    if (length >= end_counter_200) {
      let slice_200 = slice_data(counter, end_counter_200, daily_data);
      let price_MA_data = get_price_type_averages(slice_200);

      MA_obj.MA_200[end_counter_200 - 1] = price_MA_data;
    }
  }

  let after_cal = new Date().getTime();

  return MA_obj;
}

/* average all 4 price types */
function get_price_type_averages(array_of_price_data) {
  let length = array_of_price_data.length;
  // let open = array_of_price_data.reduce((a, b) => a + b["open"], 0);
  let close = array_of_price_data.reduce((a, b) => a + b["c"], 0);
  // let high = array_of_price_data.reduce((a, b) => a + b["high"], 0);
  // let low = array_of_price_data.reduce((a, b) => a + b["low"], 0);
  let price_average_obj = {
    // open: parseFloat((open / length).toFixed(2)),
    c: parseFloat((close / length).toFixed(4))
    // high: parseFloat((high / length).toFixed(2)),
    // low: parseFloat((low / length).toFixed(2))
  };
  return price_average_obj;
}

function slice_data(start, end, array) {
  return array.slice(start, end);
}
