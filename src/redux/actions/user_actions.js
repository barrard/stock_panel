import { toastr } from "react-redux-toastr";

export const LOGIN_ATTEMPT = Symbol("LOGIN_ATTEMPT");
export const LOGIN_ATTEMPT_SUCCESS = Symbol("LOGIN_ATTEMPT_SUCCESS");
export const LOGIN_ATTEMPT_FAIL = Symbol("LOGIN_ATTEMPT_FAIL");

export const REGISTER_ATTEMPT = Symbol("REGISTER_ATTEMPT");
export const REGISTER_ATTEMPT_SUCCESS = Symbol("REGISTER_ATTEMPT_SUCCESS");
export const REGISTER_ATTEMPT_FAIL = Symbol("REGISTER_ATTEMPT_FAIL");

export function logout_user(props) {
  return async (dispatch) => {
    try {
      let resp = await fetch(
        `${process.env.REACT_APP_API_SERVER}/auth/logout`,
        {
          credentials: "include",
        }
      );
      if (!resp) throw "Error logging out.";
      toastr.success(
        "Good Bye",
        `Hope to see you back soon!`
      );

      dispatch({
        type: "LOGOUT_USER",
      });
      props.history.push('/')
    } catch (err) {
      //TODO display error msg
      console.log("err");
      console.log(err);
      dispatch({});
    }
  };
}

export function set_user_is_logged_in(user) {
  toastr.success(`Welcome back ${user.firstname}`);

  return {
    type: "SET_USER_IS_LOGGED_IN",
    user,
    isLoggedIn: true,
  };
}

// export function register_attempt(user) {
//   const { email, password } = user;
//   return (dispatch) => {
//     dispatch({
//       type: REGISTER_ATTEMPT,
//       username: email,
//       password,
//     });
//   };
// }

// export function register_success(payload) {
//   return {
//     type: REGISTER_ATTEMPT_SUCCESS,
//     payload,
//   };
// }


export function login_success(user) {
  return set_user_is_logged_in(user);
}
