import { toastr } from "react-redux-toastr";

export function logout_user(props) {
    return async (dispatch) => {
        try {
            let resp = await fetch(`${process.env.REACT_APP_API_SERVER}/auth/logout`, {
                credentials: "include",
            });
            if (!resp) throw new Error("Error logging out.");
            toastr.success("Good Bye", `Hope to see you back soon!`);

            dispatch({
                type: "LOGOUT_USER",
            });
            props.history.push("/");
        } catch (err) {
            //TODO display error msg
            console.log("err");
            console.log(err);
            dispatch({});
        }
    };
}

export function set_user_is_logged_in(user) {
    toastr.success(`Welcome back ${user.primary_email}`);

    return {
        type: "SET_USER_IS_LOGGED_IN",
        user,
        isLoggedIn: true,
    };
}

export function login_success(user) {
    return set_user_is_logged_in(user);
}
