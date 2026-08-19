# Role assignment rules

| Actor | May own a school | May assign to self | May assign to Leader | May assign to Staff | Can see delegated Staff schools |
|---|---:|---:|---:|---:|---:|
| Admin/CEO | No (management account) | No | Yes | Yes | All schools |
| Leader | Yes | Yes | No | Yes | Yes, when delegated by that Leader |
| Staff | Yes | Yes (new school for self) | No | No | Own only |

The server enforces these rules. Frontend selectors are not treated as authorization controls.
