import styled from "styled-components";

export const StyledSVG = styled.svg`
    border: 1px solid red;
    width: ${({ width }) => `${width}px`};
    height: ${({ height }) => `${height}px`};
    background: #444;
`;

export const StyledXAxis = styled.g`
    user-select: none;
    transform: ${({ margin, innerHeight }) =>
        `translate(${margin.left}px, ${innerHeight}px)`};
`;

export const StyledYAxis = styled.g`
    user-select: none;
    transform: ${({ width, margin }) => `translate(${width - margin.right}px)`};
`;
