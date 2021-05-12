import styled from "styled-components"

export const MainTitle = styled.div`
  display: flex;
  width: 100%;
  justify-content: center;
  align-items: center;
  font-weight: bold;
  font-size: 28px;
`
export const SubTitle = styled.div`
  display: flex;
  /* width: 100%; */
  white-space: pre;
  justify-content: center;
  align-items: center;
  font-weight: bold;
  font-size: 18px;
`
export const StyledInput = styled.input`
  max-width: inherit;
  background: grey;
  border-radius: 5px;
  cursor: inherit;
`

export const StyledInputLabel = styled.label`
  cursor: inherit;
  background: grey;
  border-radius: 5px;
  padding: 0.1em 0.2em;
  margin: 1em;
`

export const HoverSelect = styled.span`
  &:hover {
    border: 1px solid blue;
    display: inline-block;
  }
`

export const Clickable = styled.div`
  cursor: pointer;
`

export const IsSelectable = styled.div`
  border: ${({ isSelecting, isSelected }) =>
    isSelected
      ? `3px solid green`
      : isSelecting
      ? `1px solid goldenrod`
      : null};
  /* margin: ${({ isSelecting }) => (isSelecting ? `0.3em` : null)};
  padding: ${({ isSelecting }) => (isSelecting ? `0.3em` : null)}; */
  cursor: pointer;
  &:hover {
    background-color: ${({ isSelecting }) => (isSelecting ? `#888` : null)};
  }
`

export const Scrollable = styled.div`
  overflow-y: auto;
  border: 10px solid red;
  height: ${({ height }) => (height ? height : "unset")};
`

export const Button = styled.button`
  padding: 10px;
`
