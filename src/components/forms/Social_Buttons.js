import React from "react";

class Social_Buttons extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
  }
  render() {
    return (
      <div className="col-sm-12">
        <div className="row justify_center">
         
                  {/*  FACEBOOK */}
                  
          <a href="/auth/facebook" className="sc-btn sc--flat sc--facebook">
            <span className="sc-icon">
                <svg className='svg-social-icons' viewBox="0 0 33 33" width="25" height="25" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink"><g><path d="M 17.996,32L 12,32 L 12,16 l-4,0 l0-5.514 l 4-0.002l-0.006-3.248C 11.993,2.737, 13.213,0, 18.512,0l 4.412,0 l0,5.515 l-2.757,0 c-2.063,0-2.163,0.77-2.163,2.209l-0.008,2.76l 4.959,0 l-0.585,5.514L 18,16L 17.996,32z"></path></g></svg>
            </span>
            <span className="sc-text">
                Sign in with Facebook
            </span>
          </a>
          {/*  GOOGLE PLUS */}
          <a href="/auth/google" className="sc-btn sc--flat sc--google-plus">
            <span className="sc-icon">
                <svg className='svg-social-icons' viewBox="0 0 33 33" width="25" height="25" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink"><g><path d="M 17.471,2c0,0-6.28,0-8.373,0C 5.344,2, 1.811,4.844, 1.811,8.138c0,3.366, 2.559,6.083, 6.378,6.083 c 0.266,0, 0.524-0.005, 0.776-0.024c-0.248,0.475-0.425,1.009-0.425,1.564c0,0.936, 0.503,1.694, 1.14,2.313 c-0.481,0-0.945,0.014-1.452,0.014C 3.579,18.089,0,21.050,0,24.121c0,3.024, 3.923,4.916, 8.573,4.916 c 5.301,0, 8.228-3.008, 8.228-6.032c0-2.425-0.716-3.877-2.928-5.442c-0.757-0.536-2.204-1.839-2.204-2.604 c0-0.897, 0.256-1.34, 1.607-2.395c 1.385-1.082, 2.365-2.603, 2.365-4.372c0-2.106-0.938-4.159-2.699-4.837l 2.655,0 L 17.471,2z M 14.546,22.483c 0.066,0.28, 0.103,0.569, 0.103,0.863c0,2.444-1.575,4.353-6.093,4.353 c-3.214,0-5.535-2.034-5.535-4.478c0-2.395, 2.879-4.389, 6.093-4.354c 0.75,0.008, 1.449,0.129, 2.083,0.334 C 12.942,20.415, 14.193,21.101, 14.546,22.483z M 9.401,13.368c-2.157-0.065-4.207-2.413-4.58-5.246 c-0.372-2.833, 1.074-5.001, 3.231-4.937c 2.157,0.065, 4.207,2.338, 4.58,5.171 C 13.004,11.189, 11.557,13.433, 9.401,13.368zM 26,8L 26,2L 24,2L 24,8L 18,8L 18,10L 24,10L 24,16L 26,16L 26,10L 32,10L 32,8 z"></path></g></svg>
            </span>
            <span className="sc-text">
                Sign in with Google+
            </span>
          </a>
          {/* <div className="col-sm-6">
            <a
              href="/auth/facebook"
              className="social-button"
              id="facebook-connect"
            >
              {" "}
              <span className="pl-3">Facebook</span>
            </a>
          </div>
          <div className="col-sm-6">
            <a href="/auth/google" className="social-button" id="google-connect">
              {" "}
              <span className="pl-4">Google</span>
            </a>
          </div> */}
          {/*  <div class='col-sm-6'> 
            <a href="/auth/twitter" className="social-button" id="twitter-connect"> <span className="pl-4">Twitter</span></a>
    
          </div>
          <div class='col-sm-6'>
            <a href="/auth/linkedin" className="social-button" id="linkedin-connect"> <span className="pl-4">LinkedIn</span></a> 
          </div> */}
        </div>
      </div>
    );
  }
}
export default Social_Buttons;
