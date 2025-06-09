const testData = {
    users: [
        {
            address: "0x1234567890abcdef1234567890abcdef12345678",
            did: "did:example:123",
            isVerified: true,
            profileHash: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcdef"
        },
        {
            address: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcdef",
            did: "did:example:456",
            isVerified: false,
            profileHash: "0x1234567890abcdef1234567890abcdef12345678"
        }
    ],
    collaterals: [
        {
            userAddress: "0x1234567890abcdef1234567890abcdef12345678",
            tokenAddress: "0xTokenAddress1",
            amount: 1000,
            value: 5000,
            liquidationThreshold: 80,
            depositTime: 1620000000
        },
        {
            userAddress: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcdef",
            tokenAddress: "0xTokenAddress2",
            amount: 500,
            value: 2500,
            liquidationThreshold: 70,
            depositTime: 1620000000
        }
    ],
    loans: [
        {
            userAddress: "0x1234567890abcdef1234567890abcdef12345678",
            loanId: 1,
            amount: 10000,
            interestRate: 5,
            duration: 30,
            startTime: 1620000000,
            endTime: 1620003600,
            isRepaid: false
        },
        {
            userAddress: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcdef",
            loanId: 2,
            amount: 5000,
            interestRate: 7,
            duration: 60,
            startTime: 1620000000,
            endTime: 1620007200,
            isRepaid: true
        }
    ]
};

module.exports = testData;