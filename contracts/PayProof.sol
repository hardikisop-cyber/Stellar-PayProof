// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract PayProof {
    struct Payment {
        address employer;
        uint256 amount;
        uint256 timestamp;
        uint256 blockNumber;
        string note;
    }

    mapping(address => Payment[]) private employeeHistory;

    event PaymentRecorded(
        address indexed employer,
        address indexed employee,
        uint256 amount,
        uint256 timestamp,
        uint256 blockNumber
    );

    event PaymentFailed(
        address indexed employer,
        address indexed employee,
        uint256 amount
    );

    function payEmployee(
        address employee,
        string calldata note
    ) external payable {
        require(msg.value > 0, "Payment must be greater than 0");

        Payment memory payment = Payment({
            employer: msg.sender,
            amount: msg.value,
            timestamp: block.timestamp,
            blockNumber: block.number,
            note: note
        });

        employeeHistory[employee].push(payment);

        (bool ok, ) = payable(employee).call{value: msg.value}("");
        require(ok, "Transfer failed");

        emit PaymentRecorded(
            msg.sender,
            employee,
            msg.value,
            block.timestamp,
            block.number
        );
    }

    function batchPay(
        address[] calldata employees,
        uint256[] calldata amounts,
        string calldata note
    ) external payable {
        require(
            employees.length == amounts.length,
            "Employees and amounts length mismatch"
        );
        require(employees.length <= 100, "Batch size exceeds 100");

        uint256 totalAmount = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            totalAmount += amounts[i];
        }
        require(msg.value >= totalAmount, "Insufficient funds");

        for (uint256 i = 0; i < employees.length; i++) {
            address employee = employees[i];
            uint256 amount = amounts[i];

            Payment memory payment = Payment({
                employer: msg.sender,
                amount: amount,
                timestamp: block.timestamp,
                blockNumber: block.number,
                note: note
            });

            employeeHistory[employee].push(payment);

            (bool ok, ) = payable(employee).call{value: amount}("");

            if (ok) {
                emit PaymentRecorded(
                    msg.sender,
                    employee,
                    amount,
                    block.timestamp,
                    block.number
                );
            } else {
                emit PaymentFailed(msg.sender, employee, amount);
            }
        }
    }

    function getHistory(
        address employee
    ) external view returns (Payment[] memory) {
        return employeeHistory[employee];
    }

    function getSummary(
        address employee,
        uint256 fromTimestamp
    )
        external
        view
        returns (
            uint256 totalAmount,
            uint256 paymentCount,
            uint256 earliestPayment,
            uint256 latestPayment
        )
    {
        Payment[] memory history = employeeHistory[employee];

        uint256 total = 0;
        uint256 count = 0;
        uint256 earliest = type(uint256).max;
        uint256 latest = 0;

        for (uint256 i = 0; i < history.length; i++) {
            if (history[i].timestamp >= fromTimestamp) {
                total += history[i].amount;
                count += 1;

                if (history[i].timestamp < earliest) {
                    earliest = history[i].timestamp;
                }
                if (history[i].timestamp > latest) {
                    latest = history[i].timestamp;
                }
            }
        }

        if (count == 0) {
            earliest = 0;
        }

        return (total, count, earliest, latest);
    }
}
