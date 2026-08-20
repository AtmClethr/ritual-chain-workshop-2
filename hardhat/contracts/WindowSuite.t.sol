// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {RitualPredict} from "./RitualPredict.sol";
import {RitualChain} from "./ritual/RitualChain.sol";
import {FakeAgenda, FakeTill, FakeRoster, FakeWire, FakeCut} from "./doubles/Fakes.sol";

contract WindowSuite is Test {
    RitualPredict w;
    address ann;
    address ben;
    address node;

    function setUp() public {
        ann = makeAddr("ann");
        ben = makeAddr("ben");
        node = makeAddr("node");
        vm.etch(RitualChain.SCHEDULER, address(new FakeAgenda()).code);
        vm.etch(RitualChain.RITUAL_WALLET, address(new FakeTill()).code);
        vm.etch(RitualChain.TEE_SERVICE_REGISTRY, address(new FakeRoster()).code);
        vm.etch(RitualChain.HTTP_PRECOMPILE, address(new FakeWire()).code);
        vm.etch(RitualChain.JQ_PRECOMPILE, address(new FakeCut()).code);
        FakeRoster(RitualChain.TEE_SERVICE_REGISTRY).set(node, true);
        FakeWire(RitualChain.HTTP_PRECOMPILE).set(200, bytes('{"price":4300}'), "");
        FakeCut(RitualChain.JQ_PRECOMPILE).set(4300);
        w = new RitualPredict(1000);
        vm.deal(ann, 80 ether);
        vm.deal(ben, 80 ether);
        vm.deal(address(this), 80 ether);
    }

    function _p() internal pure returns (RitualPredict.NewMarket memory) {
        return RitualPredict.NewMarket({
            question: "Does ETH print 4000+ at the bell?",
            oracleUrl: "https://tape.example/eth",
            jsonPath: ".price",
            target: 4000,
            comparator: RitualPredict.Comparator.GTE,
            bettingSeconds: 30,
            resolveDelaySeconds: 15
        });
    }

    function _id() internal returns (uint256) {
        return w.createMarket(_p());
    }

    function _ring(uint256 id) internal {
        RitualPredict.Market memory m = w.getMarket(id);
        vm.roll(m.resolveBlock);
        FakeAgenda(RitualChain.SCHEDULER).ping(m.scheduleId, 0);
    }

    function testZeroMsReverts() public {
        vm.expectRevert(RitualPredict.BadDuration.selector);
        new RitualPredict(0);
    }

    function testOpenKeepsClock() public {
        uint256 id = _id();
        RitualPredict.Market memory m = w.getMarket(id);
        assertEq(m.closeBlock, uint64(block.number + 30));
        assertEq(m.resolveBlock, uint64(block.number + 45));
        assertEq(m.scheduleId, 1);
    }

    function testRejectLocalFeed() public {
        RitualPredict.NewMarket memory p = _p();
        p.oracleUrl = "http://localhost/x";
        vm.expectRevert(RitualPredict.BadFeed.selector);
        w.createMarket(p);
    }

    function testRejectLoopback() public {
        RitualPredict.NewMarket memory p = _p();
        p.oracleUrl = "https://127.0.0.1/x";
        vm.expectRevert(RitualPredict.BadFeed.selector);
        w.createMarket(p);
    }

    function testRejectNoDotPath() public {
        RitualPredict.NewMarket memory p = _p();
        p.jsonPath = "price";
        vm.expectRevert(RitualPredict.BadPath.selector);
        w.createMarket(p);
    }

    function testRejectEmptyQ() public {
        RitualPredict.NewMarket memory p = _p();
        p.question = "";
        vm.expectRevert(RitualPredict.EmptyString.selector);
        w.createMarket(p);
    }

    function testTinyBetReverts() public {
        uint256 id = _id();
        vm.prank(ann);
        vm.expectRevert(RitualPredict.TinyBet.selector);
        w.bet{value: 0.001 ether}(id, true);
    }

    function testFatBetReverts() public {
        uint256 id = _id();
        vm.prank(ann);
        vm.expectRevert(RitualPredict.FatBet.selector);
        w.bet{value: 51 ether}(id, true);
    }

    function testPlaceBothSides() public {
        uint256 id = _id();
        vm.prank(ann);
        w.bet{value: 2 ether}(id, true);
        vm.prank(ben);
        w.bet{value: 1 ether}(id, false);
        assertEq(w.getMarket(id).totalYes, 2 ether);
        assertEq(w.getMarket(id).totalNo, 1 ether);
    }

    function testClosedWindow() public {
        uint256 id = _id();
        vm.roll(w.getMarket(id).closeBlock);
        vm.prank(ann);
        vm.expectRevert(RitualPredict.BettingClosed.selector);
        w.bet{value: 1 ether}(id, true);
    }

    function testViewClosed() public {
        uint256 id = _id();
        vm.roll(w.getMarket(id).closeBlock);
        assertEq(uint8(w.getMarket(id).state), uint8(RitualPredict.MarketState.Closed));
    }

    function testOnlyAgendaWakes() public {
        uint256 id = _id();
        vm.expectRevert(RitualPredict.OnlyScheduler.selector);
        w.onScheduledResolve(0, id);
    }

    function testEarlyPingNoop() public {
        uint256 id = _id();
        FakeAgenda(RitualChain.SCHEDULER).ping(w.getMarket(id).scheduleId, 0);
        assertEq(w.getMarket(id).attempts, 0);
    }

    function testYesOn4300() public {
        uint256 id = _id();
        vm.prank(ann);
        w.bet{value: 1 ether}(id, true);
        vm.prank(ben);
        w.bet{value: 1 ether}(id, false);
        _ring(id);
        assertEq(uint8(w.getMarket(id).outcome), uint8(RitualPredict.Outcome.Yes));
        assertEq(uint8(w.getMarket(id).state), uint8(RitualPredict.MarketState.Resolved));
    }

    function testNoOn3900() public {
        FakeCut(RitualChain.JQ_PRECOMPILE).set(3900);
        uint256 id = _id();
        vm.prank(ann);
        w.bet{value: 1 ether}(id, true);
        vm.prank(ben);
        w.bet{value: 1 ether}(id, false);
        _ring(id);
        assertEq(uint8(w.getMarket(id).outcome), uint8(RitualPredict.Outcome.No));
    }

    function testWireDownNotNo() public {
        FakeWire(RitualChain.HTTP_PRECOMPILE).kill(true);
        uint256 id = _id();
        vm.prank(ann);
        w.bet{value: 1 ether}(id, true);
        _ring(id);
        assertEq(uint8(w.getMarket(id).outcome), uint8(RitualPredict.Outcome.Unresolved));
    }

    function testThreeKillsVoid() public {
        FakeWire(RitualChain.HTTP_PRECOMPILE).kill(true);
        uint256 id = _id();
        RitualPredict.Market memory m = w.getMarket(id);
        vm.roll(m.resolveBlock);
        FakeAgenda(RitualChain.SCHEDULER).ping(m.scheduleId, 0);
        FakeAgenda(RitualChain.SCHEDULER).ping(m.scheduleId, 1);
        FakeAgenda(RitualChain.SCHEDULER).ping(m.scheduleId, 2);
        assertEq(uint8(w.getMarket(id).state), uint8(RitualPredict.MarketState.Invalid));
    }

    function testOneSidedVoids() public {
        uint256 id = _id();
        vm.prank(ben);
        w.bet{value: 1 ether}(id, false);
        _ring(id);
        assertEq(w.getMarket(id).invalidReason, "one sided");
    }

    function testPayoutFour() public {
        uint256 id = _id();
        vm.prank(ann);
        w.bet{value: 3 ether}(id, true);
        vm.prank(ben);
        w.bet{value: 1 ether}(id, false);
        _ring(id);
        uint256 b = ann.balance;
        vm.prank(ann);
        w.claimWinnings(id);
        assertEq(ann.balance - b, 4 ether);
    }

    function testRefundAfterVoid() public {
        FakeWire(RitualChain.HTTP_PRECOMPILE).kill(true);
        uint256 id = _id();
        vm.prank(ann);
        w.bet{value: 2 ether}(id, true);
        RitualPredict.Market memory m = w.getMarket(id);
        vm.roll(m.resolveBlock);
        FakeAgenda(RitualChain.SCHEDULER).ping(m.scheduleId, 0);
        FakeAgenda(RitualChain.SCHEDULER).ping(m.scheduleId, 1);
        FakeAgenda(RitualChain.SCHEDULER).ping(m.scheduleId, 2);
        uint256 b = ann.balance;
        vm.prank(ann);
        w.claimRefund(id);
        assertEq(ann.balance - b, 2 ether);
    }

    function testClockMatches() public {
        (uint64 c, uint64 r) = w.clockFor(30, 15);
        uint256 id = _id();
        assertEq(w.getMarket(id).closeBlock, c);
        assertEq(w.getMarket(id).resolveBlock, r);
    }

    function testEscrow() public {
        w.fundExecution{value: 0.3 ether}(40);
        assertEq(w.executionBalance(), 0.3 ether);
        assertEq(w.escrowUntil(), block.number + 40);
    }

    function testJunkNotNo() public {
        FakeWire(RitualChain.HTTP_PRECOMPILE).junk(hex"11");
        uint256 id = _id();
        _ring(id);
        assertEq(uint8(w.getMarket(id).outcome), uint8(RitualPredict.Outcome.Unresolved));
    }

    function testNoNodeMiss() public {
        FakeRoster(RitualChain.TEE_SERVICE_REGISTRY).set(address(0), false);
        uint256 id = _id();
        _ring(id);
        assertEq(uint8(w.getMarket(id).state), uint8(RitualPredict.MarketState.Resolving));
    }

    function testLoserBlocked() public {
        uint256 id = _id();
        vm.prank(ann);
        w.bet{value: 1 ether}(id, true);
        vm.prank(ben);
        w.bet{value: 1 ether}(id, false);
        _ring(id);
        vm.prank(ben);
        vm.expectRevert(RitualPredict.NothingToClaim.selector);
        w.claimWinnings(id);
    }

    function testMatchesRule() public view {
        assertTrue(w.matchesRule(4000, 4000, RitualPredict.Comparator.GTE));
        assertFalse(w.matchesRule(1, 2, RitualPredict.Comparator.GT));
    }

    function testShortBetWindow() public {
        RitualPredict.NewMarket memory p = _p();
        p.bettingSeconds = 5;
        vm.expectRevert(RitualPredict.BadDuration.selector);
        w.createMarket(p);
    }

    function testBareUrl() public {
        RitualPredict.NewMarket memory p = _p();
        p.oracleUrl = "tape.example/eth";
        vm.expectRevert(RitualPredict.BadFeed.selector);
        w.createMarket(p);
    }
}
