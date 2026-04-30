#![no_std]

use soroban_sdk::{contract, contractclient, contractimpl, contracttype, Address, Env, Vec};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CredibilityScore {
    pub employer: Address,
    pub score: u32,
    pub payment_count: u32,
    pub total_amount: i128,
    pub last_payment_timestamp: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PassportSummary {
    pub owner: Address,
    pub average_score: u32,
    pub max_score: u32,
    pub employer_count: u32,
    pub total_payment_count: u32,
}

#[contractclient(name = "PayProofClient")]
pub trait PayProofContract {
    fn get_reputation(env: Env, employer: Address) -> CredibilityScore;
}

#[contract]
pub struct PassportContract;

#[contractimpl]
impl PassportContract {
    pub fn get_passport(
        env: Env,
        payproof_contract: Address,
        owner: Address,
        employers: Vec<Address>,
    ) -> PassportSummary {
        owner.require_auth();

        if employers.is_empty() {
            return PassportSummary {
                owner,
                average_score: 0,
                max_score: 0,
                employer_count: 0,
                total_payment_count: 0,
            };
        }

        let payproof = PayProofClient::new(&env, &payproof_contract);

        let mut total_score: u32 = 0;
        let mut max_score: u32 = 0;
        let mut total_payment_count: u32 = 0;

        for employer in employers.iter() {
            let rep = payproof.get_reputation(&employer);
            total_score = total_score.saturating_add(rep.score);
            total_payment_count = total_payment_count.saturating_add(rep.payment_count);
            if rep.score > max_score {
                max_score = rep.score;
            }
        }

        let employer_count = employers.len() as u32;
        let average_score = if employer_count > 0 {
            total_score / employer_count
        } else {
            0
        };

        PassportSummary {
            owner,
            average_score,
            max_score,
            employer_count,
            total_payment_count,
        }
    }
}
