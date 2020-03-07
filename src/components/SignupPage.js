import React from "react";
import { connect } from "react-redux";
import {toastr} from 'react-redux-toastr'
import { Link, withRouter } from "react-router-dom";

import * as user_actions from '../redux/actions/user_actions.js'
import Signup_form from "../components/forms/Signup_Form.js";
// import {ensure_not_loggedin} from '../components/utils/auth.js'

const { register_success, register_attempt, set_user} = user_actions; 

class Signup extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      errors: [],
      email: "",
      password: "",
      confirm_password:'',
      csrf:props.meta.csrf
    };
    this.handle_signup = this.handle_signup.bind(this)
    this.handle_signup_resp = this.handle_signup_resp.bind(this)
    this.handle_input = this.handle_input.bind(this)
    
  }

//   static async getInitialProps(ctx) {
//     ensure_not_loggedin(ctx)
//     let state = ctx.store.getState()

//     return {state}
//   }

    componentDidMount(){

    }


  /* Get form input */
  handle_input(input, type) {
    this.setState({ [type]: input });
    // this.props.handle_input(input, type)

    // console.log({ input, type });
  }

  /* Handle FORM POST SIGNUP */
  async handle_signup(data) {
    //TODO start some spinner?
    this.props.dispatch(register_attempt(data))
    try {
      // console.log(this.props)
      // console.log(this.state)
      const _csrf = this.props.meta.csrf

      const {email, password, confirm_password} = data
      let resp = await fetch('/auth/signup', {
        method:'POST',
        headers: {
          "Content-Type": "application/json",
          // "Content-Type": "application/x-www-form-urlencoded",
      },
        body:JSON.stringify({email, password, confirm_password, _csrf})
      })
      this.handle_signup_resp(resp);
    } catch (err) {
      //TOSO display error msg
      console.log('err')
      console.log(err)
    }

  }

  /* Make a handler for signup resp */
  /* Should we log in or show errors */
  async handle_signup_resp(resp){
    try {
      let json = await resp.json()
      if(json.errors &&json.errors.length){
        console.log('WE GOT ERRORS')
        json.errors.map(err => {
          toastr.error('Error Message', `${err.msg}`)
        })
        // this.setState({
        //   errors:json.errors.map(err => err)
        // })
      }else if(json.success && json.user){
        //TODO notify login
        //Push page?
        this.props.dispatch(set_user(json.user));
  
        toastr.success('New User', `You are being logged in as ${this.state.email}`)
        // this.props.location.push('/account-profile')
  
      }
    } catch (err) {
      console.log('err')
      console.log(err)
      //this means login failed
      toastr.error('Error....')
    }
  }


  render() {
    // console.log(this.props)
    return (

        <div >

          <div className="row mt-5 text-center">
            <div className="col-md-6 offset-md-3">
              <h1>Signup</h1>          
            </div>
          </div>

          <div className="row mt-5 text-center">
            <div className="col-md-10  offset-md-1">
              <Signup_form
                handle_input={this.handle_input}
                handle_signup={this.handle_signup}
                csrf={this.props.meta.csrf} 
              />

           
            </div>
          </div>
        </div>
    );
  }
}
function mapStateToProps(state) {
  return  {...state} ;
}
export default connect(mapStateToProps)(Signup);
