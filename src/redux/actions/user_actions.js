

export const LOGIN_ATTEMPT = Symbol('LOGIN_ATTEMPT')
export const LOGIN_ATTEMPT_SUCCESS = Symbol('LOGIN_ATTEMPT_SUCCESS')
export const LOGIN_ATTEMPT_FAIL = Symbol('LOGIN_ATTEMPT_FAIL')

export const REGISTER_ATTEMPT = Symbol('REGISTER_ATTEMPT')
export const REGISTER_ATTEMPT_SUCCESS = Symbol('REGISTER_ATTEMPT_SUCCESS')
export const REGISTER_ATTEMPT_FAIL = Symbol('REGISTER_ATTEMPT_FAIL')


export function set_user (user){
  return dispatch =>{
    dispatch({
      type:"SET_USER", 
      user, is_loggedin:true
    })
  }
}


export function register_attempt (user){
  const {email, password} = user;
  return dispatch =>{
    dispatch({
      type:REGISTER_ATTEMPT, 
      username:email,
      password

    })
  }
}


export function register_success (payload) {
  return {
    type: REGISTER_ATTEMPT_SUCCESS,
    payload
  }
}


export function login_attempt (user){
  const {email, password} = user;
  return dispatch =>{
    dispatch({
      type:LOGIN_ATTEMPT, 
      username:email,
      password

    })
  }
}


export function login_success (payload) {
  return {
    type: 'SET_USER',
    user:payload
  }
}
