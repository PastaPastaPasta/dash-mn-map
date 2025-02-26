#!/usr/bin/env python3
import requests
import json
import time

# Configuration
BATCH_SIZE = 100
REQUESTS_PER_MINUTE = 15
SLEEP_TIME = 60 / REQUESTS_PER_MINUTE  # Approximately 4 seconds between requests

def load_masternodes(filename="masternodes.json"):
    with open(filename, "r") as f:
        return json.load(f)

def get_valid_nodes(masternodes):
    """
    Returns a list of dictionaries containing the masternode key and its IP address.
    Skips entries with invalid addresses like "[::]:0" or unspecified IPv6 "[::]".
    """
    nodes = []
    for key, mn in masternodes.items():
        addr = mn.get("address", "")
        if not addr or addr == "[::]:0":
            print(f"Skipping masternode {key}: invalid address '{addr}'")
            continue
        # Extract IP (everything before the colon)
        ip = addr.split(':')[0]
        if not ip or ip == "[::]":
            print(f"Skipping masternode {key}: extracted IP '{ip}' is invalid")
            continue
        nodes.append({"key": key, "ip": ip})
    return nodes

def query_batch(batch):
    """
    Given a batch (list) of queries in the format [{ "query": "IP" }, ...],
    sends a POST request to ip-api.com's batch endpoint and returns the results.
    """
    url = "http://ip-api.com/batch"
    headers = {"Content-Type": "application/json"}
    try:
        response = requests.post(url, json=batch, headers=headers)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print("Error querying batch:", e)
        return []

def main():
    masternodes = load_masternodes()
    nodes = get_valid_nodes(masternodes)
    geolocations = {}

    total_batches = (len(nodes) + BATCH_SIZE - 1) // BATCH_SIZE
    print(f"Found {len(nodes)} valid nodes, split into {total_batches} batches.")

    for i in range(total_batches):
        start = i * BATCH_SIZE
        end = start + BATCH_SIZE
        chunk = nodes[start:end]
        batch_queries = [{"query": node["ip"]} for node in chunk]
        print(f"Processing batch {i+1}/{total_batches} with {len(batch_queries)} IPs...")
        results = query_batch(batch_queries)
        for node, result in zip(chunk, results):
            # Map the IP to its geolocation data.
            geolocations[node["ip"]] = result
        # Respect the rate limit unless it's the last batch
        if i < total_batches - 1:
            print(f"Sleeping for {SLEEP_TIME} seconds to respect rate limits...")
            time.sleep(SLEEP_TIME)

    # Save the geolocation data to a file
    with open("masternodes_geolocations.json", "w") as outfile:
        json.dump(geolocations, outfile, indent=2)
    print("Geolocation data saved to 'masternodes_geolocations.json'")

if __name__ == "__main__":
    main()
