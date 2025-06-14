import styled from "styled-components";

export const Container = styled.div`
    max-width: 1400px;
    margin: 0 auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    background: #444;
`;

export const TabsContainer = styled.div`
    border-bottom: 1px solid #777;
`;

export const TabsList = styled.nav`
    display: flex;
    gap: 32px;
    margin-bottom: -1px;
`;

export const Tab = styled.button`
    padding: 8px 4px;
    border: none;
    border-bottom: 2px solid transparent;
    background: none;
    font-weight: 500;
    font-size: 14px;
    color: ${(props) => (props.active ? "#5563eb" : "#777")};
    border-bottom-color: ${(props) => (props.active ? "#5563eb" : "transparent")};
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
        color: ${(props) => (props.active ? "#5563eb" : "aqua")};
        border-bottom-color: ${(props) => (props.active ? "#5563eb" : "#ccc")};
    }
`;

export const OptionsChainContainer = styled.div`
    border-radius: 8px;
    border: 1px solid #777;
    overflow: hidden;
`;

export const TableContainer = styled.div`
    overflow-x: auto;
`;

export const Table = styled.table`
    width: 100%;
    border-collapse: collapse;
`;

export const TableHead = styled.thead`
    background-color: #aaa;
`;

export const TableHeader = styled.th`
    padding: 12px;
    text-align: left;
    font-size: 12px;
    font-weight: 500;
    color: #333;
    text-transform: uppercase;
    letter-spacing: 0.5px;
`;

export const TableBody = styled.tbody`
    background: white;
`;

export const TableRow = styled.tr`
    background-color: ${(props) => (props.itm ? "rgb(74, 222, 128)" : "white")};
    transition: background-color 0.1s;

    &:hover {
        background-color: ${(props) => (props.itm ? "#ecfdf5" : "#f9fafb")};
    }

    & + & {
        border-top: 1px solid #f0f0f0;
    }
`;

export const TableCell = styled.td`
    padding: 16px 12px;
    white-space: nowrap;
    font-size: 14px;
    color: #111;
`;

export const StrikeCell = styled(TableCell)`
    font-weight: 600;
`;

export const ChangeCell = styled(TableCell)`
    font-weight: 600;
    color: ${(props) => (props.positive ? "green" : "red")};
    text-shadow: 1px 1px 1px rgba(0, 0, 0, 1);
`;

export const UnderlyingContainer = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 8px 0;
    margin: 4px 0;
    border-top: 1px solid #3b82f6;
    border-bottom: 1px solid #3b82f6;
    background: linear-gradient(90deg, transparent 0%, #93c5fd 15%, #60a5fa 50%, #93c5fd 85%, transparent 100%);

    position: relative;
    gap: 24px;
`;

export const UnderlyingPrice = styled.div`
    font-size: 16px;
    font-weight: 700;
    color: #1e40af;
    background: white;
    padding: 4px 12px;
    border-radius: 4px;
    border: 1px solid #3b82f6;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`;

export const UnderlyingStats = styled.div`
    display: flex;
    gap: 12px;
    font-size: 12px;
`;

export const UnderlyingStat = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    background: white;
    padding: 2px 6px;
    border-radius: 3px;

    .label {
        color: #6b7280;
        font-size: 10px;
        margin-bottom: 1px;
    }

    .value {
        font-weight: 600;
        color: #111;
        font-size: 11px;
    }
`;

export const Lvl2Text = styled.div`
    font-size: 10px;
    color: #333;
    margin-top: 2px;
    line-height: 1.1;
`;

export const PutCell = styled(TableCell)`
    text-align: right;
    background-color: rgb(255, 90, 90);
    border-right: 1px solid #e5e7eb;
    tr:hover & {
        background-color: rgb(255, 50, 90);
    }
`;

export const CallCell = styled(TableCell)`
    text-align: left;
    background-color: rgb(74, 222, 128);
    border-left: 1px solid #e5e7eb;
    tr:hover & {
        background-color: rgb(74, 202, 128);
    }
`;

export const StrikeCellCenter = styled(StrikeCell)`
    text-align: center;
    background-color: #f9fafb;
    border-left: 1px solid #e5e7eb;
    border-right: 1px solid #e5e7eb;
    font-weight: 700;
    tr:hover & {
        background-color: #f3f4f6;
    }
`;

export const PutChangeCell = styled(ChangeCell)`
    text-align: right;
    background-color: rgb(255, 90, 90);
    tr:hover & {
        background-color: rgb(255, 50, 90);
    }
`;

export const CallChangeCell = styled(ChangeCell)`
    text-align: left;
    background-color: rgb(74, 222, 128);
    tr:hover & {
        background-color: rgb(74, 202, 128);
    }
`;
