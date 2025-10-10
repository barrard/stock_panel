import React, { useState, useEffect, memo } from "react";
import styled from "styled-components";
import { AiOutlinePlus, AiOutlineClose } from "react-icons/ai";

const PRESET_STORAGE_KEY = "liquidityHeatmapPresets";

// Default presets
const DEFAULT_PRESETS = [
    {
        name: "Bookmap Style",
        colorStops: [
            { color: "#000033", threshold: 0 },
            { color: "#000066", threshold: 15 },
            { color: "#0000ff", threshold: 30 },
            { color: "#00ff00", threshold: 60 },
            { color: "#ffff00", threshold: 90 },
            { color: "#ff8800", threshold: 120 },
            { color: "#ff0000", threshold: 180 },
            { color: "#ffffff", threshold: 250 },
        ],
    },
    {
        name: "Classic Heat",
        colorStops: [
            { color: "#000000", threshold: 0 },
            { color: "#00008B", threshold: 55 },
            { color: "#0000ff", threshold: 100 },
            { color: "#00ffff", threshold: 200 },
            { color: "#ffff00", threshold: 300 },
            { color: "#ff8800", threshold: 400 },
            { color: "#ff0000", threshold: 500 },
            { color: "#ffffff", threshold: 550 },
        ],
    },
    {
        name: "Simple Intensity",
        colorStops: [
            { color: "#000000", threshold: 0 },
            { color: "#0000ff", threshold: 10 },
            { color: "#00ffff", threshold: 25 },
            { color: "#00ff00", threshold: 50 },
            { color: "#ffff00", threshold: 100 },
            { color: "#ff8800", threshold: 200 },
            { color: "#ff0000", threshold: 500 },
        ],
    },
];

function ColorSchemeEditor({ colorScheme, onChange }) {
    const [currentScheme, setCurrentScheme] = useState(colorScheme);
    const [presets, setPresets] = useState([]);
    const [savePresetName, setSavePresetName] = useState("");
    const [showSaveDialog, setShowSaveDialog] = useState(false);

    // Load presets from localStorage on mount
    useEffect(() => {
        const stored = localStorage.getItem(PRESET_STORAGE_KEY);
        if (stored) {
            try {
                const parsedPresets = JSON.parse(stored);
                setPresets([...DEFAULT_PRESETS, ...parsedPresets]);
            } catch (e) {
                console.error("Failed to parse presets:", e);
                setPresets(DEFAULT_PRESETS);
            }
        } else {
            setPresets(DEFAULT_PRESETS);
        }
    }, []);

    const savePresets = (newPresets) => {
        // Filter out default presets before saving
        const customPresets = newPresets.filter((p) => !DEFAULT_PRESETS.find((dp) => dp.name === p.name));
        localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(customPresets));
        setPresets(newPresets);
    };

    const handleColorChange = (index, newColor) => {
        const updated = {
            ...currentScheme,
            colorStops: currentScheme.colorStops.map((stop, i) => (i === index ? { ...stop, color: newColor } : stop)),
        };
        setCurrentScheme(updated);
        // Don't call onChange here - will be called onBlur
    };

    const handleThresholdChange = (index, newThreshold) => {
        const updated = {
            ...currentScheme,
            colorStops: currentScheme.colorStops.map((stop, i) =>
                i === index ? { ...stop, threshold: parseFloat(newThreshold) || 0 } : stop
            ),
        };
        setCurrentScheme(updated);
        // Don't call onChange here - will be called onBlur
    };

    const handleInputBlur = () => {
        onChange(currentScheme); // Apply when user finishes editing
    };

    const addColorStop = () => {
        const lastStop = currentScheme.colorStops[currentScheme.colorStops.length - 1];
        const newThreshold = lastStop.threshold + 50;
        const updated = {
            ...currentScheme,
            name: currentScheme.name + " (Modified)",
            colorStops: [...currentScheme.colorStops, { color: "#ffffff", threshold: newThreshold }],
        };
        setCurrentScheme(updated);
        onChange(updated); // Apply immediately
    };

    const removeColorStop = (index) => {
        if (currentScheme.colorStops.length <= 2) {
            alert("Must have at least 2 color stops");
            return;
        }
        const updated = {
            ...currentScheme,
            colorStops: currentScheme.colorStops.filter((_, i) => i !== index),
        };
        setCurrentScheme(updated);
        onChange(updated); // Apply immediately
    };

    const handleLoadPreset = (preset) => {
        setCurrentScheme(preset);
        onChange(preset); // Apply immediately
    };

    const handleSavePreset = () => {
        if (!savePresetName.trim()) {
            alert("Please enter a preset name");
            return;
        }

        const newPreset = {
            name: savePresetName,
            colorStops: [...currentScheme.colorStops],
        };

        const updatedPresets = [...presets, newPreset];
        savePresets(updatedPresets);
        setSavePresetName("");
        setShowSaveDialog(false);
        setCurrentScheme(newPreset);
    };

    const handleDeletePreset = (presetName) => {
        // Don't allow deleting default presets
        if (DEFAULT_PRESETS.find((p) => p.name === presetName)) {
            alert("Cannot delete default presets");
            return;
        }
        // eslint-disable-next-line no-restricted-globals
        if (!confirm(`Delete preset "${presetName}"?`)) {
            return;
        }

        const updatedPresets = presets.filter((p) => p.name !== presetName);
        savePresets(updatedPresets);
    };

    return (
        <Container>
            <Section>
                <Label>Preset:</Label>
                <PresetRow>
                    <select
                        value={currentScheme.name}
                        onChange={(e) => {
                            const preset = presets.find((p) => p.name === e.target.value);
                            if (preset) handleLoadPreset(preset);
                        }}
                        style={selectStyle}
                    >
                        {presets.map((preset) => (
                            <option key={preset.name} value={preset.name}>
                                {preset.name}
                            </option>
                        ))}
                    </select>
                    {!DEFAULT_PRESETS.find((p) => p.name === currentScheme.name) && (
                        <DeleteBtn onClick={() => handleDeletePreset(currentScheme.name)} tabIndex={0}>Delete</DeleteBtn>
                    )}
                </PresetRow>
            </Section>

            <Section>
                <Label>Color Stops:</Label>
                <ColorStopsList>
                    {currentScheme.colorStops.map((stop, index) => (
                        <ColorStopRow key={index}>
                            <ColorInputWrapper>
                                <ColorInput
                                    type="color"
                                    value={stop.color}
                                    onChange={(e) => handleColorChange(index, e.target.value)}
                                    onBlur={handleInputBlur}
                                    tabIndex={0}
                                />
                                <ColorLabel>{stop.color}</ColorLabel>
                            </ColorInputWrapper>
                            <Divider>━━━</Divider>
                            <ThresholdInput
                                onWheel={(e) => e.target.blur()} // Prevent changing number on scroll
                                type="number"
                                value={stop.threshold}
                                onChange={(e) => handleThresholdChange(index, e.target.value)}
                                onBlur={handleInputBlur}
                                tabIndex={0}
                            />
                            {currentScheme.colorStops.length > 2 && (
                                <RemoveBtn tabIndex={-1} onClick={() => removeColorStop(index)}>
                                    <AiOutlineClose />
                                </RemoveBtn>
                            )}
                        </ColorStopRow>
                    ))}
                    <AddButton onClick={addColorStop} tabIndex={0}>
                        <AiOutlinePlus /> Add Color Stop
                    </AddButton>
                </ColorStopsList>
            </Section>

            <ButtonRow>
                <SaveBtn onClick={() => setShowSaveDialog(true)}>Save as Preset</SaveBtn>
            </ButtonRow>

            {showSaveDialog && (
                <SaveDialog>
                    <DialogContent>
                        <h4 style={{ margin: "0 0 10px 0", color: "#fff" }}>Save Preset</h4>
                        <input
                            type="text"
                            value={savePresetName}
                            onChange={(e) => setSavePresetName(e.target.value)}
                            placeholder="Enter preset name..."
                            style={inputStyle}
                            autoFocus
                        />
                        <DialogButtons>
                            <button onClick={handleSavePreset} style={buttonStyle}>
                                Save
                            </button>
                            <button
                                onClick={() => {
                                    setShowSaveDialog(false);
                                    setSavePresetName("");
                                }}
                                style={{ ...buttonStyle, background: "#ff6b6b" }}
                            >
                                Cancel
                            </button>
                        </DialogButtons>
                    </DialogContent>
                </SaveDialog>
            )}
        </Container>
    );
}

const Container = styled.div`
    padding: 15px;
    color: #fff;
`;

const Section = styled.div`
    margin-bottom: 20px;
`;

const Label = styled.div`
    font-weight: bold;
    margin-bottom: 8px;
    font-size: 12px;
    color: #aaa;
`;

const PresetRow = styled.div`
    display: flex;
    gap: 10px;
    align-items: center;
`;

const ColorStopsList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const ColorStopRow = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 5px;
    background: #1a1a1a;
    border-radius: 4px;
`;

const ColorInputWrapper = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const ColorInput = styled.input`
    width: 40px;
    height: 30px;
    border: 1px solid #555;
    border-radius: 4px;
    cursor: pointer;
    background: transparent;
`;

const ColorLabel = styled.span`
    font-size: 11px;
    color: #aaa;
    font-family: monospace;
    min-width: 70px;
`;

const Divider = styled.span`
    color: #555;
    font-size: 10px;
`;

const ThresholdInput = styled.input`
    width: 80px;
    padding: 6px;
    background: #333;
    border: 1px solid #555;
    border-radius: 4px;
    color: #fff;
    font-size: 13px;
`;

const RemoveBtn = styled.button`
    background: #ff4444;
    border: none;
    color: white;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;

    &:hover {
        background: #ff6666;
    }
`;

const AddButton = styled.button`
    background: #2a2a2a;
    border: 1px dashed #555;
    color: #aaa;
    padding: 8px;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    font-size: 12px;

    &:hover {
        background: #333;
        border-color: #777;
        color: #fff;
    }
`;

const ButtonRow = styled.div`
    display: flex;
    gap: 10px;
    margin-top: 15px;
`;

const SaveBtn = styled.button`
    flex: 1;
    padding: 8px;
    background: #444;
    border: 1px solid #666;
    color: #fff;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;

    &:hover {
        background: #555;
    }
`;

const ApplyBtn = styled.button`
    flex: 1;
    padding: 8px;
    background: #28a745;
    border: 1px solid #28a745;
    color: #fff;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
    font-weight: bold;

    &:hover {
        background: #218838;
    }
`;

const DeleteBtn = styled.button`
    padding: 6px 12px;
    background: #dc3545;
    border: 1px solid #dc3545;
    color: #fff;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;

    &:hover {
        background: #c82333;
    }
`;

const SaveDialog = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10002;
`;

const DialogContent = styled.div`
    background: #222;
    border: 2px solid #666;
    border-radius: 8px;
    padding: 20px;
    min-width: 300px;
`;

const DialogButtons = styled.div`
    display: flex;
    gap: 10px;
    margin-top: 15px;
`;

const selectStyle = {
    flex: 1,
    padding: "8px",
    background: "#333",
    border: "1px solid #555",
    borderRadius: "4px",
    color: "#fff",
    fontSize: "13px",
};

const inputStyle = {
    width: "100%",
    padding: "8px",
    background: "#333",
    border: "1px solid #555",
    borderRadius: "4px",
    color: "#fff",
    fontSize: "13px",
};

const buttonStyle = {
    flex: 1,
    padding: "8px",
    background: "#28a745",
    border: "1px solid #28a745",
    borderRadius: "4px",
    color: "#fff",
    cursor: "pointer",
    fontSize: "13px",
};

export default memo(ColorSchemeEditor);
