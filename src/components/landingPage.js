import React from "react";
import { connect } from "react-redux";
// import { toastr } from "react-redux-toastr";

import { set_movers } from "../redux/actions/stock_actions.js";
import List_Stock_Data from "./landingPageComponents/List_Stock_Data.js";

import API from "../components/API.js";

class Landing_Page extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      movers: {}
    };
  }

  async componentDidMount() {
    console.log("landing");
    let { movers } = this.props.stock_data;
    if(!Object.keys(movers).length){

      let movers = await API.getMovers();
      movers = await movers.json();
      console.log(movers);
      this.props.dispatch(set_movers(movers));
    }
  }

  render() {
    // console.log(this.props)
    let { movers } = this.props.stock_data;
    // console.log({movers})
    return (
      <div className="row flex_center">
        <div className="col-sm-6">
          <div className="row ">
            {!Object.keys(movers).length &&
            <div>No Data</div>}
            {
              Object.keys(movers).map((market, index) => {
                let { down, up } = movers[market];
                // console.log({down, up})

                return (
                  <div className="full-width" key = {index}>
                    {up.percent && up.value&& <List_Stock_Data title={`${market} Up`} data={up} props={this.props} />}
                    {down.percent && down.value&&<List_Stock_Data title={`${market} Down`} data={down} props={this.props} />}
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    );
  }
}

function mapStateToProps(state) {
  return state;
}

export default connect(mapStateToProps)(Landing_Page);
