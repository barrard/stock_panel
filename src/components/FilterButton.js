import React, { useState } from "react";
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
      {FilterList}
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
position:absolute;
top:0px;
right:0px;
`;

const Container = styled.div`
    display: flex;
    flex-wrap: wrap;
  z-index: 100;
  position: fixed;
  top: 10px;
  right: 10px;
  background: #eee;
  border: 1px solid black;
`;

const P = styled.p`
&:hover{
  background:#fff;
  cursor: pointer;
}
  text-align:center;
  margin:0;
  padding:.5em;
` 

const FilterListItem = ({sym, handleClick})=>{
  return <P onClick={handleClick}>{sym}</P>

}