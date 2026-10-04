"""AURA Security Module — URL validation, SSRF protection, input sanitization."""

import ipaddress
import os
import re
import socket
from urllib.parse import urlparse
from typing import Tuple

# When AURA_ALLOW_LOCAL is true (default), localhost / private-IP scanning is
# permitted.  Set AURA_ALLOW_LOCAL=false in production cloud deployments to
# enable full SSRF protection.
ALLOW_LOCAL = os.getenv("AURA_ALLOW_LOCAL", "true").lower() in ("true", "1", "yes")

# Private/reserved IP ranges — only enforced when ALLOW_LOCAL is False
BLOCKED_IP_RANGES = [
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("169.254.0.0/16"),  # link-local
    ipaddress.ip_network("0.0.0.0/8"),
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("fc00::/7"),  # IPv6 private
    ipaddress.ip_network("fe80::/10"),  # IPv6 link-local
]

# Always-blocked cloud metadata endpoints (dangerous even locally)
ALWAYS_BLOCKED_HOSTNAMES = [
    "metadata.google.internal",
    "169.254.169.254",  # cloud metadata
]

BLOCKED_TLD = [".internal"]


def validate_url(url: str) -> Tuple[bool, str]:
    """Validate URL for safety. Returns (is_valid, cleaned_url_or_error)."""
    if not url or not url.strip():
        return False, "URL is required"

    url = url.strip()

    # Must have scheme
    if not url.startswith(("http://", "https://")):
        url = "https://" + url

    try:
        parsed = urlparse(url)
    except Exception:
        return False, "Invalid URL format"

    # Scheme check
    if parsed.scheme not in ("http", "https"):
        return False, "Only HTTP and HTTPS URLs are allowed"

    # Hostname check
    hostname = parsed.hostname
    if not hostname:
        return False, "URL must have a valid hostname"

    hostname_lower = hostname.lower()

    # Always block cloud metadata endpoints regardless of ALLOW_LOCAL
    if hostname_lower in ALWAYS_BLOCKED_HOSTNAMES:
        return False, f"Access to {hostname} is not allowed (cloud metadata protection)"

    # Block dangerous TLDs
    for tld in BLOCKED_TLD:
        if hostname_lower.endswith(tld):
            return False, f"Access to {tld} domains is not allowed"

    # If local access is NOT allowed, enforce SSRF protection
    if not ALLOW_LOCAL:
        local_hostnames = ["localhost", "127.0.0.1", "0.0.0.0", "::1"]
        if hostname_lower in local_hostnames:
            return False, f"Access to {hostname} is not allowed"

        for tld in [".local", ".localhost"]:
            if hostname_lower.endswith(tld):
                return False, f"Access to {tld} domains is not allowed"

        # Resolve and check IP against private ranges
        try:
            resolved_ips = socket.getaddrinfo(hostname, None)
            for family, _, _, _, sockaddr in resolved_ips:
                ip_str = sockaddr[0]
                try:
                    ip = ipaddress.ip_address(ip_str)
                    for blocked_range in BLOCKED_IP_RANGES:
                        if ip in blocked_range:
                            return False, "Access to private/reserved IP ranges is not allowed"
                except ValueError:
                    continue
        except socket.gaierror:
            pass

    return True, url


def sanitize_input(text: str, max_length: int = 10000) -> str:
    """Sanitize text input."""
    if not text:
        return ""
    text = text[:max_length]
    text = text.replace("\x00", "")
    return text


def is_safe_selector(selector: str) -> bool:
    """Check if a CSS selector is safe to use."""
    if not selector:
        return False
    dangerous_patterns = [
        r"javascript:",
        r"data:",
        r"expression\(",
        r"url\(",
        r"eval\(",
        r"<script",
    ]
    selector_lower = selector.lower()
    for pattern in dangerous_patterns:
        if re.search(pattern, selector_lower):
            return False
    return True


class RateLimiter:
    def __init__(self, max_requests: int = 10, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._requests: dict = {}

    def is_allowed(self, key: str = "global") -> bool:
        import time
        now = time.time()
        if key not in self._requests:
            self._requests[key] = []

        self._requests[key] = [
            t for t in self._requests[key] if now - t < self.window_seconds
        ]

        if len(self._requests[key]) >= self.max_requests:
            return False

        self._requests[key].append(now)
        return True


rate_limiter = RateLimiter(max_requests=20, window_seconds=60)
