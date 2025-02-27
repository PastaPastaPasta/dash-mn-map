# Dash Masternode Map

Uses IPs found in `masternodelist` RPC to globally geomap all active (and PoSe banned) masternodes for the Dash network.

## To View

Must be served via HTTPS (not opened as a local file).

1.  The included script will run `caddy` with local https enabled:
    ```sh
    ./scripts/serve
    ```
2.  View at <https://local.digitalcash.dev>

## To Update

0. Install `python3` (via `pyenv`)
    ```sh
    curl https://webi.sh/python3 | sh
    ```
1. Create and activate the project virtual environment
    ```sh
    python3 -m venv ./venv
    . ./venv/bin/activate
    ```
2. Install project dependencies
    ```sh
    pip install -r ./requirements.txt
    ```
3. Run the updater
    ```sh
    python3 ./update_geolocations.py
    ```
