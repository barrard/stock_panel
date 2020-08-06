import React from "react";
import { connect } from "react-redux";
import { Link, withRouter } from "react-router-dom";

import {
  set_symbols_data,
  set_search_symbol,
  add_chart_data,
} from "../redux/actions/stock_actions.js";
import {
  view_selected_stock,
  view_selected_commodity,
  getMinutelyCommodityData,
} from "./landingPageComponents/chart_data_utils.js";
import { is_loading, show_filter_list } from "../redux/actions/meta_actions.js";
import { logout_user } from "../redux/actions/user_actions.js";
import API from "./API.js";
class Main_Nav extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      search_symbol: "",
      filtered_stock_list: [],
      highlightedSymbolListIndex: 0,
      listWindowScrollCount:0,
      // searching: true,
      // stock_selected: false
      // show_filter_list: false
    };

    this.handle_search_symbol_input = this.handle_search_symbol_input.bind(
      this
    );
    this.make_filter_list = this.make_filter_list.bind(this);
    this.highlight_search_letters = this.highlight_search_letters.bind(this);
    this.filtered_stock_list_item = this.filtered_stock_list_item.bind(this);
    this.handleLogout = this.handleLogout.bind(this);
    this.arrowKeyListSelect = this.arrowKeyListSelect.bind(this);
  }
  async componentDidMount() {
    try {
      const { has_symbols_data } = this.props.stock_data;
      // console.log({ has_symbols_data });
      if (has_symbols_data) return;
      let { dispatch } = this.props;
      await API.getAllSymbolsData(dispatch);
    } catch (err) {
      console.log("err");
      console.log(err);
    }
  }

  componentDidUpdate(prevProps) {
    this.handleSetSymbol(prevProps);
  }

  handleSetSymbol(prevProps) {
    let currentSymbol = this.props.stock_data.search_symbol;
    let prevSymbol = prevProps.stock_data.search_symbol;
    if (currentSymbol !== prevSymbol) {
      this.setState({ search_symbol: currentSymbol });
    }
  }

  arrowKeyListSelect(e) {
    console.log(e.key);
    let { highlightedSymbolListIndex, listWindowScrollCount, filtered_stock_list } = this.state;
    if (e.key === "ArrowDown") {
      //acess the list?
      highlightedSymbolListIndex++;
    } else if (e.key === "ArrowUp") {
      highlightedSymbolListIndex--;
    } else if (e.key === "Enter") {
      let el = document.querySelectorAll(".selectedSymbolListItem")[0];
      if (!el) return console.log("No symbol selected");
      el.dispatchEvent(
        new MouseEvent("click", {
          view: window,
          bubbles: true,
          cancelable: true,
          buttons: 1,
        })
      );
    }
    else return
    
    if (highlightedSymbolListIndex < 0) highlightedSymbolListIndex = 0;
    if(highlightedSymbolListIndex >= filtered_stock_list.length){
      highlightedSymbolListIndex = filtered_stock_list.length - 1
    }
    this.setState({
      highlightedSymbolListIndex,
    });
    //TODO move this function?
    var observerAndScroll = new IntersectionObserver(
      function (el) {
        if (el.isIntersecting === true) {
          return true
        } else {
          return false
        }
      },
      { threshold: [0] }
    );
    setTimeout(() => {
      let el = document.querySelectorAll(".selectedSymbolListItem")[0];
      if (el) {
        let isVisable = observerAndScroll.observe(el);
        console.log({isVisable})
        if(!isVisable){
          // let listWindow = document.querySelectorAll('.filtered_stock_list')
          console.log(el)
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' })

          // el.parentNode.scrollTop = el.offsetTop - el.parentNode.offsetTop;
        }
      }
    }, 0);
  }
  handle_search_symbol_input(e) {
    if (!this.props.meta.show_filter_list) {
      this.props.dispatch(show_filter_list(true));
    }
    // this.props.dispatch(set_search_symbol(e.target.value));
    this.make_filter_list(e.target.value);
    this.setState({
      search_symbol: e.target.value,
      highlightedSymbolListIndex: 0,
    });
  }

  /* On input makes the list */
  make_filter_list(search_text) {
    console.log({ search_text });
    let full_list;
    if (search_text.split("")[0] === "/") {
      console.log("its a commmoodity");
      search_text = search_text.slice(1);
      full_list = this.props.stock_data.commodity_symbols_data;
      console.log({ search_text, full_list });
    } else {
      // console.log({search_text, full_list})
      // console.log(search_text.split('')[0])
      full_list = this.props.stock_data.stock_symbols_data;
    }
    search_text = search_text.toUpperCase();
    // console.log(full_list)
    if (!full_list) {
      /* wait a second...  try again */
      setTimeout(() => this.make_filter_list(search_text), 100);
      return;
    }
    // console.log({search_text, full_list})
    // console.log(full_list);
    /* list of possible arrays with data */
    var symbol_starts_with = [];
    var name_starts_with = [];
    var symbol_list = [];
    var name_list = [];
    var filtered_stock_list = [];

    /* check symbol starts with */
    symbol_starts_with = full_list.filter((list_item) =>
      list_item.Ticker.toUpperCase().startsWith(search_text)
    );
    // console.log(symbol_starts_with);
    filtered_stock_list = [...filtered_stock_list, ...symbol_starts_with];
    if (filtered_stock_list.length < 100) {
      /* check name starts with */
      name_starts_with = full_list.filter((list_item) =>
        list_item.Name.toUpperCase().startsWith(search_text)
      );
      // console.log(name_starts_with);
      filtered_stock_list = [...filtered_stock_list, ...name_starts_with];
    }

    if (filtered_stock_list.length < 100) {
      /* check symbols */
      symbol_list = full_list.filter((list_item) =>
        list_item.Ticker.toUpperCase().includes(search_text)
      );
      // console.log(symbol_list);
      filtered_stock_list = [...filtered_stock_list, ...symbol_list];
    }

    if (filtered_stock_list.length < 100) {
      /* check name */
      name_list = full_list.filter((list_item) =>
        list_item.Name.toUpperCase().includes(search_text)
      );
      // console.log(name_list);
      filtered_stock_list = [...filtered_stock_list, ...name_list];
    }
    /* Combine the lists */
    filtered_stock_list = [...new Set(filtered_stock_list)];
    filtered_stock_list = filtered_stock_list.splice(0, 100);
    this.setState({ filtered_stock_list });
  }

  /* Use the filtered stock list to make items */
  Filtered_Stock_List({ filtered_stock_list, search_symbol }) {
    if (search_symbol.split("")[0] === "/")
      search_symbol = search_symbol.slice(1);
    return (
      <div className="filtered_stock_list">
        <>
          {filtered_stock_list.length == 0 && (
            <div className="filtered_stock_list_item">
              Sorry there aren't any stocks matching{" "}
              <span className="highlight_search">{search_symbol}</span>
            </div>
          )}
          {filtered_stock_list.map((data, index) =>
            this.filtered_stock_list_item(data, index, search_symbol)
          )}
        </>
      </div>
    );
  }

  /* Items that make the list of filtered stocks, on click event resets some things */
  filtered_stock_list_item(data, index, search) {
    let symbol = data.Ticker;
    let { isCommodity } = data;
    let props = this.props;
    let timeframe = "day";
    let end = new Date().getTime();
    let isSelected = index === this.state.highlightedSymbolListIndex;
    return (
      <div
        className={`filtered_stock_list_item ${
          isSelected ? "selectedSymbolListItem" : " "
        }`}
        key={index}
        onClick={() => {
          if (isCommodity) {
            return props.history.push(`/commodity/${symbol}`);
          } else {
            return props.history.push(`/chart/${symbol}`);
          }
        }}
      >
        <span
          dangerouslySetInnerHTML={this.highlight_search_letters(
            data.Ticker,
            search
          )}
        />
        {" - "}
        <span
          dangerouslySetInnerHTML={this.highlight_search_letters(
            data.Name,
            search
          )}
        />
      </div>
    );
  }

  highlight_search_letters(name, search) {
    let index_of_search_term_name = name
      .toUpperCase()
      .indexOf(search.toUpperCase());

    if (index_of_search_term_name >= 0) {
      var split_name = name.split("");
      split_name.splice(
        index_of_search_term_name + search.length,
        0,
        `</span>`
      );
      split_name.splice(
        index_of_search_term_name,
        0,
        `<span class="highlight_search">`
      );
      name = split_name.join("");
    }
    return { __html: name };
  }

  handleLogout(e) {
    e.preventDefault();
    this.props.dispatch(logout_user(this.props));
  }
  render() {
    let isLoggedIn = this.props.user.isLoggedIn;
    let { pathname } = this.props.location;

    return (
      <nav className="navbar navbar-dark bg-dark relative ">
        <Link activeclassname="active" className="navbar-brand " to="/">
          Home
        </Link>

        {/* <button
          className="navbar-toggler"
          type="button"
          data-toggle="collapse"
          data-target="#navbarSupportedContent"
          aria-controls="navbarSupportedContent"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon" />
        </button> */}

        {/* <div className="collapse navbar-collapse" id="navbarSupportedContent"> */}
        <ul className="nav-bar-links">
          {!isLoggedIn && <Register_Login_Links pathname={pathname} />}
          {isLoggedIn && (
            <Logout_Link pathname={pathname} handleLogout={this.handleLogout} />
          )}

          {isLoggedIn && <TradesLink />}

        </ul>
        <Navbar_Search
          /* Let the list stay long enough to click */
          handle_search_input_blur={() =>
            setTimeout(() => {
              this.setState({ highlightedSymbolListIndex: 0 });
              // this.props.dispatch(show_filter_list(false));
            }, 200)
          }
          arrowKeyListSelect={this.arrowKeyListSelect}
          handle_search_input={(e) => this.handle_search_symbol_input(e)}
          search_symbol={this.state.search_symbol}
          handle_search={(e) => this.handle_search(e)}
        />
        {/* </div> */}
        {this.props.meta.show_filter_list &&
          this.Filtered_Stock_List({
            filtered_stock_list: this.state.filtered_stock_list,
            search_symbol: this.state.search_symbol,
          })}
      </nav>
    );
  }
}

function mapStateToProps(state) {
  return state;
}

export default connect(mapStateToProps)(withRouter(Main_Nav));

/*              Nav components               */

const Navbar_Search = ({
  handle_search_input,
  handle_search,
  arrowKeyListSelect,
  search_symbol,
  handle_search_input_blur,
}) => (
  <div className="form-inline ">
    <label className='white' htmlFor="symbol search">Symbol Search</label>
    <input
      onKeyDown={arrowKeyListSelect}
      onBlur={handle_search_input_blur}
      onChange={(e) => handle_search_input(e)}
      className="form-control mr-sm-2"
      type="search"
      placeholder='use "/" for futures i.e. /ES'
      aria-label="Search"
      value={search_symbol}
    />
  </div>
);

const TradesLink = ({ pathname }) => (
  <Navbar_Links
    name="Trades"
    path={"/trades"}
    pathname={pathname}
  />
);


const Logout_Link = ({ pathname, handleLogout }) => (
  <>
    <Navbar_Links
      name="Profile"
      path={"/account-profile"}
      pathname={pathname}
    />
    <LogOutBtn handleLogout={handleLogout} />
    {/* <Navbar_Links name="Logout" path={`${}/auth/logout`} pathname={pathname} /> */}
  </>
);

const Register_Login_Links = ({ pathname }) => {
  return (
    <>
      <Navbar_Links name="Login" path={"/login"} pathname={pathname} />

      <Navbar_Links name="Sign Up" path={"/sign-up"} pathname={pathname} />
    </>
  );
};

const LogOutBtn = ({ handleLogout }) => (
  <li className="nav-item clickable">
    <Link
      to={"/h"}
      onClick={handleLogout}
      className={`nav-link white`}
      href={`${process.env.REACT_APP_API_SERVER}/auth/logout`}
    >
      {"Logout"}
    </Link>
  </li>
);

const Navbar_Links = ({ path, pathname, name }) => (
  <li className="nav-item">
    <Link
      className={`${pathname == path ? "active " : " "} nav-link white`}
      to={path}
    >
      {name}
    </Link>
  </li>
);
