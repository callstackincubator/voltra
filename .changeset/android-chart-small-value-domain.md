---
'@use-voltra/android-client': patch
---

Android charts now frame the values they plot instead of always starting the
y-axis at zero, and axis labels carry as many decimals as the distance between
ticks needs. A line or point series of very small values, such as exchange
rates, fills the plot and reads its own numbers, while bars and areas keep the
zero baseline their height is measured against.
