import React from "react";
import { connect } from "react-redux";
import { Link } from "react-router-dom";

import {
  set_symbols_data,
  set_search_symbol,
  add_chart_data
} from "../redux/actions/stock_actions.js";
import { view_selected_stock_symbol } from "./landingPageComponents/chart_data_utils.js";
import { is_loading, show_filter_list } from "../redux/actions/meta_actions.js";
import API from "./API.js";
class Main_Nav extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      // search_symbol: "",
      filtered_stock_list: [],
      searching: true,
      stock_selected: false
      // show_filter_list: false
    };

    this.handle_seach_symbol_input = this.handle_seach_symbol_input.bind(this);
    this.make_filter_list = this.make_filter_list.bind(this);
    this.highlight_search_letters = this.highlight_search_letters.bind(this);
    this.filtered_stock_list_item = this.filtered_stock_list_item.bind(this);
  }
  async componentDidMount() {
    console.log("123123");
    // const { api_server } = location.origin;
    // console.log(location);
    // console.log(api_server);
    try {
      const { has_symbols_data } = this.props.stock_data;
      if (has_symbols_data) return;
      console.log(this.props);
      let { dispatch } = this.props;
      let all_stock_symbols = await API.getAllSymbolsData(dispatch);
    } catch (err) {
      console.log("err");
      console.log(err);
    }
  }

  handle_seach_symbol_input(e) {
    if (!this.props.meta.show_filter_list)
      this.props.dispatch(show_filter_list(true));
    this.props.dispatch(set_search_symbol(e.target.value));
    this.make_filter_list(e.target.value);
  }
  // handle_search(e) {
  //   e.preventDefault();
  //   console.log(this.state.search);
  // }
  /* On input makes the list */
  make_filter_list(search_text) {
    var search_text = search_text.toLowerCase();
    let full_list = this.props.stock_data.symbols_data;
    if (!full_list) {
      /* wait a second...  try again */
      console.log("no full list");
      setTimeout(() => this.make_filter_list(search_text), 100);
      return;
    }
    // console.log(full_list);
    /* list of possible arrays with data */
    var symbol_starts_with = [];
    var name_starts_with = [];
    var symbol_list = [];
    var name_list = [];
    var filtered_stock_list = [];

    /* check symbol starts with */
    symbol_starts_with = full_list.filter(list_item =>
      list_item.Ticker.toLowerCase().startsWith(search_text)
    );
    // console.log(symbol_starts_with);
    filtered_stock_list = [...filtered_stock_list, ...symbol_starts_with];
    if (filtered_stock_list.length < 100) {
      /* check name starts with */
      name_starts_with = full_list.filter(list_item =>
        list_item.Name.toLowerCase().startsWith(search_text)
      );
      // console.log(name_starts_with);
      filtered_stock_list = [...filtered_stock_list, ...name_starts_with];
    }

    if (filtered_stock_list.length < 100) {
      /* check symbols */
      symbol_list = full_list.filter(list_item =>
        list_item.Ticker.toLowerCase().includes(search_text)
      );
      // console.log(symbol_list);
      filtered_stock_list = [...filtered_stock_list, ...symbol_list];
    }

    if (filtered_stock_list.length < 100) {
      /* check name */
      name_list = full_list.filter(list_item =>
        list_item.Name.toLowerCase().includes(search_text)
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
    return (
      <div
        className="filtered_stock_list_item"
        key={index}
        onClick={() => view_selected_stock_symbol(data.symbol, this.props)}
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
    // console.log({ name, search });
    let index_of_search_term_name = name
      .toLowerCase()
      .indexOf(search.toLowerCase());

    // console.log({ index_of_search_term_name });
    if (index_of_search_term_name >= 0) {
      var split_name = name.split("");

      split_name.splice(
        index_of_search_term_name + search.length,
        0,
        `</span>`
      );
      // console.log({ split_name });

      split_name.splice(
        index_of_search_term_name,
        0,
        `<span class="highlight_search">`
      );
      // console.log({ split_name });

      name = split_name.join("");
    }
    // console.log(name);

    return { __html: name };
  }

  render() {
    let is_loggedin = this.props.user.is_loggedin;
    let { pathname } = "/chart";
    console.log(window.location);
    console.log(this.props);
    console.log(this.state)
    return (
      <nav className="navbar navbar-expand-lg navbar-light bg-light relative">
        <Link to="/">
          <a className="navbar-brand">Home</a>
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
          {!is_loggedin && <Register_Login_Links pathname={pathname} />}
          {is_loggedin && <Logout_Link pathname={pathname} />}

          <Charts_Dropdown
            pathname={pathname}
            charts={this.props.stock_data.charts}
          />
          {is_loggedin && <MA_Analysis_Link />}

          {is_loggedin && <Commodity_Page_Link />}
          {is_loggedin && <Chart_Analysis_Link />}
        </ul>
        <Navbar_Search
          /* Let the list stay long enough to click */
          handle_search_input_blur={() =>
            setTimeout(() => this.props.dispatch(show_filter_list(false)), 200)
          }
          handle_search_input={e => this.handle_seach_symbol_input(e)}
          search_symbol={this.props.stock_data.search_symbol}
          handle_search={e => this.handle_search(e)}
        />
        {/* </div> */}
        {this.props.meta.show_filter_list &&
          this.Filtered_Stock_List({
            filtered_stock_list: this.state.filtered_stock_list,
            search_symbol: this.props.stock_data.search_symbol
          })}
      </nav>
    );
  }
}

function mapStateToProps(state) {
  return state;
}

export default connect(mapStateToProps)(Main_Nav);

/*              Nav components               */

const Navbar_Search = ({
  handle_search_input,
  handle_search,
  search_symbol,
  handle_search_input_blur
}) => (
  <div className="form-inline my-2 my-lg-0 absolute right_10_px z_index_100">
    <input
      onBlur={handle_search_input_blur}
      onChange={e => handle_search_input(e)}
      className="form-control mr-sm-2"
      type="search"
      placeholder="Search Symbols"
      aria-label="Search"
      value={search_symbol}
    />
  </div>
);

const Charts_Dropdown = ({ pathname, charts }) => (
  <li className="nav-item dropdown margin_right_4em">
    <a
      className="nav-link dropdown-toggle"
      href="#"
      id="navbarDropdown"
      role="button"
      data-toggle="dropdown"
      aria-haspopup="true"
      aria-expanded="false"
    >
      Charts
    </a>
    <div className="dropdown-menu" aria-labelledby="navbarDropdown">
      {charts &&
        Object.keys(charts).map((symbol, index) => (
          <Link to={`/chart?symbol=${symbol}`} key={index}>
            <a className="stock-list-dropdown">
              <p className="justify_center zero_margin">{symbol}</p>
              {index + 1 != Object.keys(charts).length && (
                <div className="dropdown-divider" />
              )}
            </a>
          </Link>
        ))}
    </div>
  </li>
);

const MA_Analysis_Link = ({ pathname }) => (
  <Navbar_Links
    name="Moving Avg. Analysis"
    path={"/moving-average-analysis"}
    pathname={pathname}
  />
);
const Commodity_Page_Link = ({ pathname }) => (
  <Navbar_Links name="Commodities" path={"/commodities"} pathname={pathname} />
);
const Chart_Analysis_Link = ({ pathname }) => (
  <Navbar_Links
    name="Chart Analysis"
    path={"/chart-analysis?symbol=aapl"}
    pathname={pathname}
  />
);

const Logout_Link = ({ pathname }) => (
  <>
    <Navbar_Links
      name="Profile"
      path={"/account-profile"}
      pathname={pathname}
    />

    <Navbar_Links
      nofetch={true}
      name="Logout"
      path={"/auth/logout"}
      pathname={pathname}
    />
  </>
);

const Register_Login_Links = ({ pathname }) => (
  <>
    <Navbar_Links name="Login" path={"/login"} pathname={pathname} />

    <Navbar_Links name="Sign Up" path={"/sign-up"} pathname={pathname} />
  </>
);

const Navbar_Links = ({ path, pathname, name, nofetch }) => (
  <>
    {!nofetch && (
      <li className="nav-item">
        <Link to={path}>
          <a
            className={`${
              pathname == path ? "active " : " "
            }" nav-link dropdown-item"`}
          >
            {name}
          </a>
        </Link>
      </li>
    )}

    {nofetch && (
      <li className="nav-item">
        <Link to={path}>
          <a
            className={`${
              pathname == path ? "active " : " "
            }" nav-link dropdown-item"`}
          >
            {name}
          </a>
        </Link>
      </li>
    )}
  </>
);
