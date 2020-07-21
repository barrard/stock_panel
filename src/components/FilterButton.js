import React from "react";
import styled from "styled-components";

function FilterButton({ show, setShow }) {
  const btnText = show ? "HIDE" : "FILTER LIST";

  let FilterList =<></>;
  if (show) {
    let list = JSON.parse(localStorage.getItem("filterList"));
    list.sort()
    // if (!list) {
    //   list = [];
    //   localStorage.setItem(JSON.stringify(list), 'filterList' )
    //   let list = JSON.parse(localStorage.getItem("filterList"));
    // }
    if (list.length === 0) {
      FilterList = <div>No Filters</div>;
    }else{
      FilterList = list.map(sym =>{
        return <FilterListItem key={sym} handleClick={()=>showSym(sym)} sym={sym} />
      })
    }
  }

  return (
    <Container>
      <Button onClick={() => setShow(!show)}>{btnText}</Button>
      {/* <FilterListContainer> */}

      {FilterList}
      {/* </FilterListContainer> */}
    </Container>
  );
}

export default FilterButton;


const showSym = (sym)=>{
  console.log({sym})
  let list = JSON.parse(localStorage.getItem("filterList"));
  console.log({list})
  list = list.filter(i => i !== sym)
  list.sort()
  localStorage.setItem('filterList', JSON.stringify(list) )
  console.log({sym, list})


}

const Button = styled.button`
position:fixed;
top:60px;
left:80px;
`;

// const FilterListContainer = styled.div`
//     display: flex;
//     flex-wrap: wrap;
//   z-index: 100;
//   position: fixed;
//   top: 60px;
//   left: 150px;
//   background: #eee;
//   border: 1px solid black;
// `;

const Container = styled.div`
    display: flex;
    flex-wrap: wrap;
  z-index: 100;
  position: fixed;
  top: 100px;
  left: 0px;
  background: #555;
  border: 1px solid white;
`;

const P = styled.p`
&:hover{
  background:#fff;
  color:#333;
  cursor: pointer;
  text-s
}
  text-align:center;
  margin:0;
  padding:.5em;
` 

const FilterListItem = ({sym, handleClick})=>{
  return <P onClick={handleClick}>{sym}</P>

}