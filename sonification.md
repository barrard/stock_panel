# Sonification

This project now includes live chart sonification on the `pixi-chart` page.

The goal is not to make every event unique in isolation. The goal is to make the sound set learnable:

- trade flow and depth flow should sound like different families
- within each family, buy-side and sell-side events should feel directionally related
- stronger events can vary intensity through `strength`
- the user should be able to mute, filter, and test sounds from the UI

## Current Frontend Location

Main integration:

- `src/components/charts/pixiChart/PixiChart.js`

Sound engine:

- `src/components/charts/pixiChart/components/OrderFlowSoundEngine.js`

## Socket Integration

The page uses the existing shared socket connection.

### Trade Flow

Subscribe:

```js
Socket.emit("subscribeOrderFlow", { symbol: "ES" });
```

Behavior notes:

- the page subscribes on load for the active symbol
- the page resubscribes when the symbol changes
- trade flow is currently always subscribed while the page is active

Listen:

```js
Socket.on("orderFlowCue", ({ type, strength }) => {
    // play trade-flow sound
});
```

Current trade cue types:

- `price_step_up`
- `price_step_down`
- `large_trade_buy`
- `large_trade_sell`
- `burst_buy`
- `burst_sell`
- `pace_buy`
- `pace_buy_fast`
- `pace_sell`
- `pace_sell_fast`
- `pace_down`

### Depth Flow

Subscribe:

```js
Socket.emit("subscribeDepthFlow", { symbol: "ES" });
```

Unsubscribe:

```js
Socket.emit("unsubscribeDepthFlow", { symbol: "ES" });
```

Behavior notes:

- depth flow subscription is controlled by the `Depth flow enabled` toggle in the sound panel
- enabling depth flow actively subscribes for the current symbol
- disabling depth flow actively unsubscribes for the current symbol
- changing symbol while depth flow is enabled unsubscribes the previous symbol and subscribes the new one through effect cleanup and re-run

Listen:

```js
Socket.on("depthFlowCue", ({ type, strength }) => {
    // play depth-flow sound
});
```

Current depth cue types:

- `depth_bid_support`
- `depth_ask_pressure`
- `depth_pull_bid`
- `depth_pull_ask`

## Sound Config UI

The `pixi-chart` toolbar now includes a `Sound` button.

This opens a compact popover with:

- `Sound enabled`
- `Depth flow enabled`
- `Minimum strength` for trade flow
- `Test Sound`
- per-cue trade test buttons
- per-cue depth test buttons

The popover is positioned relative to the toolbar button, but rendered as a fixed overlay so it is not clipped by toolbar overflow.

Settings are persisted in local storage under:

- `pixi-chart-order-flow-sound-settings`

Current stored settings shape:

```js
{
  enabled: true,
  minStrength: 1,
  depthFlowEnabled: true
}
```

## Playback Rules

### Trade Flow

Trade sounds only play when:

- `Sound enabled` is true
- incoming `strength >= minStrength`
- browser audio has been unlocked by a user interaction

### Depth Flow

Depth sounds only play when:

- `Depth flow enabled` is true
- browser audio has been unlocked by a user interaction

Depth flow currently does not use the same threshold filter as trade flow. It only uses the dedicated enable toggle.

## Audio Unlock

Because browsers gate Web Audio behind user interaction, the page explicitly unlocks audio when the user interacts with the sound controls.

Current unlock triggers:

- clicking the `Sound` button
- toggling `Sound enabled`
- toggling `Depth flow enabled`
- clicking strength buttons
- clicking test buttons

If audio is not unlocked, incoming cues may be received correctly but no sound will be heard.

## Button Flashing

When the sound panel is open, the cue test buttons flash only when a cue actually passes playback gating.

This matters because earlier versions flashed on any incoming cue, even if that cue was filtered out. That created false positives in the UI.

Current behavior:

- trade cue button flashes only if that cue would really play
- depth cue button flashes only if depth flow is enabled and that cue would really play

## Sound Design Rationale

The current design intentionally groups sounds into families instead of making every cue unrelated.

### Primary split

There are two top-level sound families:

- trade flow
- depth flow

This was done because users need to distinguish "trading activity" from "order book structure" quickly by ear.

### Secondary split

Inside each family, there is a directional split:

- buy-side
- sell-side

This was done because hearing polarity matters more than memorizing many unrelated tones.

### Family design

Trade flow is meant to sound:

- cleaner
- more tonal
- more immediate
- more event-driven

Depth flow is meant to sound:

- rougher
- more structural
- less musical
- more book-state oriented

## Why The Engine Was Refactored

Early versions were one-off mappings. That made some cues too similar for the wrong reasons, and some "buy" vs "sell" relationships were weak.

In particular, depth cues started to collapse into minor pitch variations of the same shape. That made it difficult to hear family meaning.

The engine was then refactored around four conceptual bases:

- trade buy family
- trade sell family
- depth buy family
- depth sell family

Each cue is now implemented as a flavor of one of those families, instead of as an isolated sound choice.

## Current Family Model

### Cue To Family Mapping

This is the core design rule of the current system.

Every cue should be understood first as:

1. `trade` or `depth`
2. `buy`, `sell`, or `neutral`
3. a flavor within that family

| Cue Type | Group | Polarity | Family Function |
| --- | --- | --- | --- |
| `price_step_up` | trade | buy | trade buy family, `step` flavor |
| `price_step_down` | trade | sell | trade sell family, `step` flavor |
| `large_trade_buy` | trade | buy | trade buy family, `large` flavor |
| `large_trade_sell` | trade | sell | trade sell family, `large` flavor |
| `burst_buy` | trade | buy | trade buy family, `burst` flavor |
| `burst_sell` | trade | sell | trade sell family, `burst` flavor |
| `pace_buy` | trade | buy | trade buy family, `pace` flavor |
| `pace_sell` | trade | sell | trade sell family, `pace` flavor |
| `pace_buy_fast` | trade | buy | trade buy family, `pace_fast` flavor |
| `pace_sell_fast` | trade | sell | trade sell family, `pace_fast` flavor |
| `pace_down` | trade | neutral | trade neutral family |
| `depth_bid_support` | depth | buy | depth buy family, `support` flavor |
| `depth_pull_ask` | depth | buy | depth buy family, `pull_ask` flavor |
| `depth_ask_pressure` | depth | sell | depth sell family, `pressure` flavor |
| `depth_pull_bid` | depth | sell | depth sell family, `pull_bid` flavor |

This mapping is required context for future tuning. If someone changes a sound and breaks this grouping, they are not just changing audio aesthetics, they are changing the information architecture of the sonification system.

### Trade Buy Family

Implemented through `playTradeBuyFamily(...)`.

Used by:

- `price_step_up`
- `large_trade_buy`
- `burst_buy`
- `pace_buy`
- `pace_buy_fast`

General character:

- brighter
- cleaner
- more upward / positive

### Trade Sell Family

Implemented through `playTradeSellFamily(...)`.

Used by:

- `price_step_down`
- `large_trade_sell`
- `burst_sell`
- `pace_sell`
- `pace_sell_fast`

General character:

- darker
- lower
- more downward / negative

### Trade Neutral

Implemented through `playTradeNeutralFamily(...)`.

Used by:

- `pace_down`

General character:

- neutral cooldown cue
- not strongly buy or sell

### Depth Buy Family

Implemented through `playDepthBuyFamily(...)`.

Used by:

- `depth_bid_support`
- `depth_pull_ask`

General character:

- supportive / constructive / buy-side depth

### Depth Sell Family

Implemented through `playDepthSellFamily(...)`.

Used by:

- `depth_ask_pressure`
- `depth_pull_bid`

General character:

- pressure / removal / sell-side depth

## Important Tuning Lesson

One key lesson from tuning:

- being "technically different in code" is not enough

Example:

- `depth_bid_support`
- `depth_pull_bid`

At one point these used the same waveform, same note pair, same timing, and almost the same envelope, just reversed. They were different in code, but effectively the same to the ear.

That is why `depth_pull_bid` was changed to a rougher, darker sell-side sound instead of another low tonal two-note pattern.

This is an important rule for future changes:

- if two cues are semantically different, do not rely on small pitch changes alone
- change timbre or texture when family distinction matters

## Test Buttons

The sound panel includes test buttons for both families.

The test buttons are useful for:

- verifying browser audio is unlocked
- quickly tuning similarity / separation
- confirming the meaning of each cue

Current test behavior:

- trade test buttons play through the trade sound family
- depth test buttons play through the depth sound family
- test buttons currently use the configured `minStrength` as the test strength value

This means a live event can still sound somewhat different from a test button if the live event arrives with a different `strength`.

The layout is intentionally directional:

- buy / positive cues grouped visually
- sell / negative cues grouped visually
- neutral cue on its own row

The buttons are also color-coded:

- green: buy / positive
- red: sell / negative
- blue: neutral

## Future Improvements

Potential next steps:

- add exact depth strength filtering if desired
- add a dedicated `test strength` selector instead of reusing `minStrength`
- add a master volume control
- add a compact legend describing each cue's market meaning
- remove temporary debug warnings once the backend cue names are stable

## Maintenance Notes

If backend cue names change:

1. update the socket handling assumptions in `PixiChart.js`
2. update the test button lists
3. update the mapping functions in `OrderFlowSoundEngine.js`
4. re-check that family identity still makes sense by ear

When changing sounds, always test both:

- "can I tell these two sounds apart?"
- "do these two sounds belong to the right family?"

Those are different questions, and both matter.

## Poem

Price steps whisper, bursts arrive,
depth leans heavy, books come alive.

Buy should lift and sell should fall,
trade and depth must not blur at all.

If two cues differ only in name,
the ear will fold them into the same.

So shape the timbre, split the grain,
let meaning ride inside the sound, not merely pitch or gain.
