import React from "react";
import { connect } from "react-redux";
import { Link, withRouter } from "react-router-dom";
import {getTrades} from '../redux/actions/StockBotActions.js'

class Account_Profile extends React.Component {
  constructor(props) {
    super(props);
    this.state = {

    };
  }

  async componentDidMount() {
  }

  componentWillUnmount() {
  }


  componentDidUpdate(prevProps) {
  }

  render() {
      console.log(this.props)

    return (
      
      <div className='container'>
          <div className='row flex_center'>
            <h1>Account_Profile</h1>
          </div>
          <div className='row flex_center white'>
            
          {this.props.user.user.primary_email}
          </div>

      </div>
    );
  }
}

function mapStateToProps(state) {
  const { user, stock_data, meta, stockbot } = state;
  return { user, stock_data, meta, stockbot };
}

export default connect(mapStateToProps)(withRouter(Account_Profile));
