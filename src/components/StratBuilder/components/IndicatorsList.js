import React, {useContext} from 'react'

export default function IndicatorsList({indicators, priceDataId}) {
    console.log({indicators, priceDataId})

    
    return (
        <div>
            {indicators.filter(({print()})=> priceDataId===priceData ).map(ind=>)}
            
        </div>
    )
}
