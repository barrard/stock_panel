import React from "react";
import { connect } from "react-redux";
import { toastr } from "react-redux-toastr";
import { withRouter } from 'react-router'

import Login_Form from "../components/forms/Login_Form.js";
import * as user_actions from "../redux/actions/user_actions.js";
// import {ensure_not_loggedin} from '../components/utils/auth.js'

const { login_success, login_attempt } = user_actions;

class Login extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      errors: [],
      email: "123@gg.com",
      password: "1",
      confirm_password: "1",
      _csrf: props.csrf,
    };
    this.handle_login = this.handle_login.bind(this);
    this.handle_login_resp = this.handle_login_resp.bind(this);
    this.handle_input = this.handle_input.bind(this);
  }

  // static async getInitialProps(ctx) {
  //   let state = ctx.store.getState()
  //   ensure_not_loggedin(ctx)
  //       return {state}
  // }

  componentDidMount() {
    
  }

  /* Get form input */
  handle_input(input, type) {
    this.setState({ [type]: input });
  }

  /* Handle FORM POST SIGNUP */
  async handle_login(data) {
    try {

      const _csrf = this.props.meta.csrf;
      console.log({ _csrf });

      const { email, password } = data;
      // event.preventDefault();
      let resp = await fetch(`${process.env.REACT_APP_API_SERVER}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // "Content-Type": "application/x-www-form-urlencoded",
        },
        credentials: "include",
        body: JSON.stringify({ email, password, _csrf }),
      });
      this.handle_login_resp(resp);
    } catch (err) {
      //TODO display error msg
      console.log("err");
      console.log(err);
    }
  }

  /* Make a handler for signup resp */
  /* Should we log in or show errors */
  async handle_login_resp(resp) {
    try {
      let json = await resp.json();
      if (json.errors && json.errors.length) {
        json.errors.map((err) => {
          toastr.error("Error Message", `${err.msg}`);
        });
        this.setState({
          errors: json.errors.map((err) => err),
        });
      } else if (json.success) {
        this.props.dispatch(login_success(json.user));
        this.props.history.push('/commodity/ES')

      }
    } catch (err) {
      console.log(err);
    }
  }

  render() {
    return (
      <div>
        <div className="row mt-5 text-center white">
          <div className="col-md-6 offset-md-3">
            <h1>Login</h1>
          </div>
        </div>

        <div className="row mt-5 justify_center">
          <div className="col-md-6 ">
            <Login_Form
              csrf={this.props.csrf}
              handle_input={this.handle_input}
              handle_login={this.handle_login}
            />

            <div className="row">
              <div className="offset-sm-2 col-sm-8 text-center">
                <a className="btn btn-link" href="password-reset">
                  Forgot Your Password?
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
function mapStateToProps(state) {
  const { meta } = state;
  return { ...state };
}
export default connect(mapStateToProps)(withRouter(Login));
