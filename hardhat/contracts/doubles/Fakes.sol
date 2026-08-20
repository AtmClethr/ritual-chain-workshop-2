// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract FakeAgenda {
    struct Item {
        bytes blob;
        address who;
        bool off;
    }
    uint256 public n;
    mapping(uint256 => Item) public items;

    function approveScheduler(address) external {}

    function schedule(
        bytes calldata blob,
        uint32,
        uint32,
        uint32,
        uint32,
        uint32,
        uint256,
        uint256,
        uint256,
        address
    ) external returns (uint256 id) {
        if (n == 0) n = 1;
        id = n++;
        items[id] = Item({blob: blob, who: msg.sender, off: false});
    }

    function cancel(uint256 id) external {
        items[id].off = true;
    }

    function getCallState(uint256 id) external view returns (uint8) {
        if (items[id].who == address(0)) return 4;
        if (items[id].off) return 3;
        return 0;
    }

    function ping(uint256 id, uint256 executionIndex) external {
        Item storage it = items[id];
        require(it.who != address(0), "none");
        bytes memory p = it.blob;
        require(p.length >= 36, "short");
        assembly {
            mstore(add(p, 36), executionIndex)
        }
        (bool ok, ) = it.who.call(p);
        require(ok, "ping fail");
    }
}

contract FakeTill {
    mapping(address => uint256) public balanceOf;
    mapping(address => uint256) public lockUntil;

    function deposit(uint256 lock) external payable {
        balanceOf[msg.sender] += msg.value;
        uint256 u = block.number + lock;
        if (u > lockUntil[msg.sender]) lockUntil[msg.sender] = u;
    }
}

contract FakeRoster {
    address public node;
    bool public yes = true;
    bool public down;

    function set(address node_, bool yes_) external {
        node = node_;
        yes = yes_;
    }

    function kill(bool v) external {
        down = v;
    }

    function pickServiceByCapability(uint8, bool, uint256, uint256) external view returns (address, bool) {
        if (down) revert("down");
        return (node, yes);
    }
}

contract FakeWire {
    bool public down;
    uint16 public code = 200;
    bytes public body = '{"price":4300}';
    string public msg_ = "";
    bytes public raw;
    bool public useRaw;

    function set(uint16 c, bytes calldata b, string calldata m) external {
        down = false;
        useRaw = false;
        code = c;
        body = b;
        msg_ = m;
    }

    function kill(bool v) external {
        down = v;
    }

    function junk(bytes calldata r) external {
        useRaw = true;
        raw = r;
        down = false;
    }

    fallback() external {
        if (down) revert();
        bytes memory o = useRaw
            ? raw
            : abi.encode(bytes(""), abi.encode(code, new string[](0), new string[](0), body, msg_));
        assembly {
            return(add(o, 32), mload(o))
        }
    }
}

contract FakeCut {
    bool public down;
    bool public zilch;
    uint256 public n;

    function set(uint256 v) external {
        down = false;
        zilch = false;
        n = v;
    }

    function kill(bool v) external {
        down = v;
    }

    function blank(bool v) external {
        zilch = v;
    }

    fallback() external {
        if (down) revert();
        if (zilch) {
            assembly {
                return(0, 0)
            }
        }
        uint256 v = n;
        assembly {
            mstore(0x00, v)
            return(0x00, 32)
        }
    }
}
