import React, { useState, useEffect } from "react";
import API from "./API";
import styled from "styled-components";
import Socket from "./Socket.js";

const Container = styled.div`
    padding: 1rem;
    background-color: #1a1a1a;
    color: #ffffff;
    min-height: 100vh;
`;

const Title = styled.h1`
    font-size: 1.5rem;
    font-weight: bold;
    margin-bottom: 1rem;
    color: #ffffff;
`;

const ListContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
`;

const CategorySection = styled.div`
    border: 1px solid #333333;
    border-radius: 0.5rem;
    overflow: hidden;
    background-color: #1e1e1e;
`;

const CategoryHeader = styled.div`
    background-color: #2d2d2d;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid #333333;
`;

const CategoryTitle = styled.h2`
    font-size: 1.125rem;
    font-weight: 600;
    color: #ffffff;
`;

const TickerGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 0.5rem;
    padding: 1rem;
    background-color: #1e1e1e;
`;

const TickerItem = styled.div`
    padding: 0.5rem;
    background-color: #2d2d2d;
    border: 1px solid #404040;
    border-radius: 0.25rem;
    text-align: center;
    font-family: monospace;
    font-size: 0.875rem;
    color: #ffffff;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
        background-color: #404040;
        border-color: #525252;
        transform: translateY(-1px);
    }
`;

const LoadingContainer = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    height: 16rem;
    background-color: #1a1a1a;
`;

const LoadingSpinner = styled.div`
    height: 2rem;
    width: 2rem;
    border-radius: 50%;
    border: 2px solid #333333;
    border-bottom-color: #ffffff;
    animation: spin 1s linear infinite;

    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }
`;

const Alert = styled.div`
    padding: 1rem;
    border-radius: 0.5rem;
    background-color: #3b1818;
    border: 1px solid #592727;
    color: #ff8080;
    margin-bottom: 1rem;
`;

const categoryNames = {
    highGrowth: "High Growth",
    qualityValueTickers: "Quality Value",
    momentumGrowthTickers: "Momentum Growth",
    turnaroundTickers: "Turnaround",
    cashFlowTickers: "Cash Flow",
};

export default function PickList() {
    const [pickLists, setPickLists] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchPickLists();

        Socket.on("scannerMovers", (data) => {
            console.log(data);
        });

        return () => {
            Socket.off("scannerMovers");
        };
    }, []);

    const fetchPickLists = async () => {
        try {
            const data = await API.getPickLists();

            setPickLists(data);
            setError(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <LoadingContainer>
                <LoadingSpinner />
            </LoadingContainer>
        );
    }

    if (error) {
        return <Alert>Error loading pick lists: {error}</Alert>;
    }

    return (
        <Container>
            <Title>Stock Pick Lists</Title>
            <ListContainer>
                {Object.entries(pickLists).map(([category, tickers]) => (
                    <CategorySection key={category}>
                        <CategoryHeader>
                            <CategoryTitle>{categoryNames[category]}</CategoryTitle>
                        </CategoryHeader>
                        <TickerGrid>
                            {tickers.map((ticker) => (
                                <TickerItem key={ticker}>{ticker}</TickerItem>
                            ))}
                        </TickerGrid>
                    </CategorySection>
                ))}
            </ListContainer>
        </Container>
    );
}
