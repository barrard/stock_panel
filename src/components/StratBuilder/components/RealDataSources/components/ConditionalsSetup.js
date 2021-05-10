import React, { useState } from "react"
import RealDataContext from "../context"
import { Container } from "./styled"
import { Input, Select } from "../../components"
import { TargetInputs } from "./"

export default function ConditionalsSetup() {
  let {
    isSelectingInput,
    target1,
    setTarget1,
    target2,
    setTarget2,
    equality,
    setEquality,
    targetsData,
    setTargetsData,
    selectTarget,
  } = React.useContext(RealDataContext)
  const [name, setName] = useState("")

  const equalityOptions = [
    { label: ">", value: ">" },
    { label: "<", value: "<" },
    { label: "=", value: "=" },
    { label: "=>", value: "=>" },
    { label: "<=", value: "<=" },
  ]
  return (
    <Container>
      <div>
        <Input label={"Name"} value={name} onChange={setName} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-around" }}>
        <TargetInputs
          value={{ ...targetsData.target1 }}
          setValue={(target1) => {
            debugger
            selectTarget(target1, target1.type, target1.name)

            // let data = { ...targetsData, target1 }
            // console.log(data)
            // return setTargetsData({ ...data })
          }}
          label={"Target1"}
        />

        <div>
          <Select
            value={equality}
            setValue={setEquality}
            options={equalityOptions}
          />
        </div>
        <TargetInputs
          value={targetsData.target2}
          setValue={
            (target2) => selectTarget(target2, target2.type, target2.name)
            // setTargetsData({ ...targetsData, target2: { ...target2 } })
          }
          label={"Target2"}
        />
      </div>
    </Container>
  )
}
