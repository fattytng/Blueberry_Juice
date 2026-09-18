# Door Parameter List

Full description of every column/parameter recorded in the Door opening/closing dataset's `.csv`
files — refer to this whenever a parameter name in the main documentation isn't self-explanatory.

| Parameter | Description |
|---|---|
| Datetime | Format: Year-Month-Date-Hour-Minute-Second-Millisecond |
| Car Type | — |
| Car Number | — |
| Door Number | — |
| Motor current (mA) | — |
| Motor Voltage (10mV) | — |
| Motor back electromotive force | — |
| Door opening time (0.1 s) | — |
| Door closing time (0.1 s) | — |
| Close command | A value of 1 triggers the door-closing action. |
| Open command | A value of 1 triggers the door-opening action. |
| DCSR | Door Close Switch Right. During door-closing process, it changes from released state to actuated state; during door-opening process, it changes from actuated state to released state. |
| DCSL | Door Close Switch Left. During door-closing process, it changes from released state to actuated state; during door-opening process, it changes from actuated state to released state. |
| DLSR | Door Locked Switch Right. During door-closing process, it transitions from the released state to the actuated state; during door-opening process, it transitions from the actuated state to the released state. |
| DLSL | Door Locked Switch Left. During door-closing process, it transitions from the released state to the actuated state; during door-opening process, it transitions from the actuated state to the released state. |
| Door Opened | — |
| Door Locked | — |
| Door is opening | — |
| Door is closing | — |
| Door leaf position | — |

*Parameters marked "—" are self-explanatory from the column name and the descriptions of the related
switches above.*
