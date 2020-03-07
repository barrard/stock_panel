import React from "react";
import Social_Buttons from "./Social_Buttons";

class Signup_Form extends React.Component {
  constructor(props) {
    super(props);
    // console.log('THS IS Signup FORM')
    // console.log(props)
    this.state = {

      email: "123@gg.com",
      password: "1",
      confirm_password:'1',
      csrf:props.csrf
    };
  }


  handle_input(input, type) {
    this.setState({ [type]: input });
    this.props.handle_input(input, type)

    // console.log({ input, type });
  }

  handle_signup(event) {
      const {email, password, confirm_password} = this.state
      event.preventDefault();
      this.props.handle_signup({email, password, confirm_password})
  }


  render() {
    return (
      <div className="container">
        <form onSubmit={(event)=> this.handle_signup(event)}>
          <div className="form-group row">
            <label htmlFor="example-text-input" className="col-4 col-form-label">
              Email address
            </label>
            <div className="col-8">
              <input
                onChange={(event) => this.handle_input(event.target.value, "email")}
                className="form-control"
                name="email"
                type="email"
                value={this.state.email}
                placeholder="jack@example.com"
              />
            </div>
          </div>

          <div className="form-group row">
            <label htmlFor="example-text-input" className="col-4 col-form-label">
              Password
            </label>
            <div className="col-8">
              <input
                onChange={(event) => this.handle_input(event.target.value, "password")}
                className="form-control"
                name="password"
                type="password"
                value={this.state.password}
                placeholder="*******"
              />
            </div>
          </div>
          <div className="form-group row">
            <label htmlFor="example-text-input" className="col-4 col-form-label">
              Confirm Password
            </label>
            <div className="col-8">
              <input
                onChange={(event) => this.handle_input(event.target.value, "confirm_password")}
                className="form-control"
                name="confirm_password"
                type="password"
                value={this.state.confirm_password}
                placeholder="*******"
              />
            </div>
          </div>
          <input type="hidden" name="_csrf" value={this.state.csrf} />

          <br />
          <br />
          <div className="form-group">
            <div className="offset-sm-2 col-sm-8">
              <input
                className="btn btn-lg btn-primary btn-block"
                name="submit"
                type="submit"
                value="Sign up today"
              />
            </div>
          </div>
        </form>

        {/* <div className="col-sm-12 center-text">
          <h3>Other login options</h3>
        </div> */}
        {/* <Social_Buttons /> */}
      </div>
    );
  }
}
export default Signup_Form;
