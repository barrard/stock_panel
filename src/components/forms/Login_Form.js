
import React from "react";

// import Social_Buttons from "./Social_Buttons";

class Login_Form extends React.Component {
  constructor(props) {
    super(props);
    // console.log('THS IS LOGIN FORM')
    // console.log(props)
    this.state = {

      email: "stockbot@stockbot.com",
      password: "stockbot",
      _csrf:props.csrf
    };
  }


  handle_input(input, type) {
    this.setState({ [type]: input });
    // console.log({ input, type });
    this.props.handle_input(input, type)
  }

  handle_login(e) {
  console.log('handle_login!!')
    const {email, password} = this.state
    e.preventDefault();
    this.props.handle_login({email, password})

  }


  render() {
    return (
      <div className="container white">
        <form onSubmit={(event)=>this.handle_login(event)}>
          <div className="form-group row">
            <label
              htmlFor="example-text-input"
              className="col-4 col-form-label"
            >
              Email address
            </label>
            <div className="col-8">
              <input
                onChange={(event) => this.handle_input(event.target.value, "email")}
                className="form-control"
                type="email"
                name="email"
                value={this.state.email}
                placeholder="e.g. jack@example.com"
              />
            </div>
          </div>

          <div className="form-group row">
            <label
              htmlFor="example-text-input"
              className="col-4 col-form-label"
            >
              Password
            </label>
            <div className="col-8">
              <input
                onChange={(event) => this.handle_input(event.target.value, "password")}
                className="form-control"
                type="password"
                name="password"
                value={this.state.password}
                placeholder="*******"
              />
            </div>
          </div>

          <div className="form-group row">
            <label
              htmlFor="example-text-input"
              className="col-4 col-form-label"
            />
            <div className="col-8">
              <div className="form-check">
                <label className="form-check-label">
                  <input
                    className="form-check-input"
                    name="remember_me"
                    type="checkbox"
                  />{" "}
                  Remember me
                </label>
              </div>
            </div>
          </div>
          <input
            type="hidden"
            name="_csrf"
            value={this.state._csrf}
          />

          <br />
          <br />
          <div className="form-group">
            <div className="offset-sm-2 col-sm-8">
              <input
                className="btn btn-lg btn-primary btn-block"
                name="submit"
                type="submit"
                value="Login"
              />
            </div>
          </div>
        </form>
       
   
      </div>
    );
  }
}


export default Login_Form

