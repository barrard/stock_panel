import styled from "styled-components";

export const LineSettingsModalContainer = styled.div`
    top: 20%;
    left: 10%;
    position: absolute;
    /* width: 300px;
	height: 300px; */
    background-color: #333;
    border: 1px solid #fff;
`;

export const WhiteLine = styled.hr`
    height: 2px;
    background-color: #eee;
    border: none;
`;
export const Small = styled.span`
    font-size: 10px;
    padding: 0.2em;
    cursor: default;
    /* background-color: #333; */
    &:hover {
        background-color: #666;
    }
`;

export const StyledSVG = styled.svg`
    border: 1px solid red;
    width: ${({ width }) => width}px;
    height: ${({ height, margin }) => height + margin.top + margin.bottom}px;
    background: #444;
`;

export const StyledXAxis = styled.g`
    user-select: none;
    transform: ${({ margin, height }) =>
        `translate(${margin.left}px, ${height + margin.bottom}px)`};
`;

export const StyledYAxis = styled.g`
    user-select: none;
    transform: ${({ yOffset, width, margin }) =>
        `translate(${width - margin.right}px, ${yOffset + margin.top}px)`};
`;

export const Flex = styled.div`
    display: flex;
`;
