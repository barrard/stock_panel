const initial_state = {
  user: {},
  username: "",
  password: "",
  isLoggedIn: false,
};

export default (state = initial_state, action) => {
  switch (action.type) {
    case "SET_USER_IS_LOGGED_IN": {
      return { ...state, user: action.user, isLoggedIn: true };
    }
    case "LOGOUT_USER": {
      return { ...state, user: {}, isLoggedIn: false };
    }

    default:
      return state;
  }
};
