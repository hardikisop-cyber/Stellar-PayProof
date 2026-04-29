#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, vec, Address, Env, String, Vec};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PaymentRecord {
    pub employer: Address,
    pub employee: Address,
    pub amount: i128,
    pub timestamp: u64,
    pub note: String,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PaymentSummary {
    pub total_amount: i128,
    pub payment_count: u32,
    pub earliest_payment: u64,
    pub latest_payment: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    History(Address),
}

#[contract]
pub struct PayProofContract;

fn history_key(employee: &Address) -> DataKey {
    DataKey::History(employee.clone())
}

fn load_history(env: &Env, employee: &Address) -> Vec<PaymentRecord> {
    env.storage()
        .persistent()
        .get(&history_key(employee))
        .unwrap_or(vec![env])
}

fn save_history(env: &Env, employee: &Address, history: &Vec<PaymentRecord>) {
    env.storage().persistent().set(&history_key(employee), history);
}

fn append_record(env: &Env, employer: Address, employee: Address, amount: i128, note: String) {
    if amount <= 0 {
        panic!("amount must be positive");
    }

    employer.require_auth();

    let timestamp = env.ledger().timestamp();
    let record = PaymentRecord {
        employer,
        employee: employee.clone(),
        amount,
        timestamp,
        note,
    };

    let mut history = load_history(env, &employee);
    history.push_back(record.clone());
    save_history(env, &employee, &history);

    env.events()
        .publish((symbol_short!("payment"), employee), record);
}

#[contractimpl]
impl PayProofContract {
    pub fn record_payment(env: Env, employer: Address, employee: Address, amount: i128, note: String) {
        append_record(&env, employer, employee, amount, note);
    }

    pub fn record_batch_payment(
        env: Env,
        employer: Address,
        employees: Vec<Address>,
        amounts: Vec<i128>,
        note: String,
    ) {
        if employees.len() != amounts.len() {
            panic!("employees and amounts length mismatch");
        }

        employer.require_auth();

        for index in 0..employees.len() {
            let employee = employees.get(index).expect("employee missing");
            let amount = amounts.get(index).expect("amount missing");
            append_record(&env, employer.clone(), employee, amount, note.clone());
        }
    }

    pub fn get_history(env: Env, employee: Address) -> Vec<PaymentRecord> {
        load_history(&env, &employee)
    }

    pub fn get_summary(env: Env, employee: Address) -> PaymentSummary {
        let history = load_history(&env, &employee);

        if history.is_empty() {
            return PaymentSummary {
                total_amount: 0,
                payment_count: 0,
                earliest_payment: 0,
                latest_payment: 0,
            };
        }

        let mut total_amount: i128 = 0;
        let mut payment_count: u32 = 0;
        let mut earliest_payment: u64 = u64::MAX;
        let mut latest_payment: u64 = 0;

        for record in history.iter() {
            total_amount += record.amount;
            payment_count += 1;

            if record.timestamp < earliest_payment {
                earliest_payment = record.timestamp;
            }

            if record.timestamp > latest_payment {
                latest_payment = record.timestamp;
            }
        }

        PaymentSummary {
            total_amount,
            payment_count,
            earliest_payment,
            latest_payment,
        }
    }
}

