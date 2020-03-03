import React from "react";
import { connect } from "react-redux";
// import { toastr } from "react-redux-toastr";

import { set_home_page_data } from "../redux/actions/stock_actions.js";
import { List_Stock_Data } from "./landingPageComponents/List_Stock_Data.js";

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
    let movers = await API.get_homepage_data();
    movers = await movers.json();
    console.log(movers);
    this.setState({ movers });
  }

  render() {
    console.log("landing render");
    let { movers } = this.state;
    return (
      <div className="row flex_center">
        <div className="col-sm-6">
          <div className="row ">
            {Object.keys(movers).length &&
              Object.keys(movers).map(market => {
                let { down, up } = movers[market];

                return (
                  <>
                    <List_Stock_Data title={`${market} Up`} data={up} />
                    <List_Stock_Data title={`${down} Down`} data={down} />
                  </>
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
