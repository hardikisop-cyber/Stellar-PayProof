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
pub struct CredibilityScore {
    pub employer: Address,
    pub score: u32,
    pub payment_count: u32,
    pub total_amount: i128,
    pub last_payment_timestamp: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    History(Address),
    EmployerScore(Address),
}

#[contract]
pub struct PayProofContract;

fn history_key(employee: &Address) -> DataKey {
    DataKey::History(employee.clone())
}

fn employer_score_key(employer: &Address) -> DataKey {
    DataKey::EmployerScore(employer.clone())
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

fn calculate_reputation(
    payment_count: u32,
    time_span_seconds: u64,
    total_amount: i128,
    avg_amount: i128,
) -> u32 {
    // Base score
    let mut score: u32 = 10;

    // Bonus for number of payments (each payment up to 100: +0.5 points)
    if payment_count > 0 {
        score = score.saturating_add((payment_count.min(100) / 2) as u32);
    }

    // Bonus for consistency over time (longer track record)
    let days_active = (time_span_seconds / 86400).min(365) as u32;
    score = score.saturating_add((days_active / 10) as u32);

    // Bonus for payment amounts (higher amounts = more credible)
    if avg_amount > 1_000_000 {
        score = score.saturating_add(15);
    } else if avg_amount > 500_000 {
        score = score.saturating_add(10);
    } else if avg_amount > 100_000 {
        score = score.saturating_add(5);
    }

    // Cap score at 100
    score.min(100)
}

fn append_record(env: &Env, employer: Address, employee: Address, amount: i128, note: String) {
    if amount <= 0 {
        panic!("amount must be positive");
    }

    employer.require_auth();

    let timestamp = env.ledger().timestamp();
    let record = PaymentRecord {
        employer: employer.clone(),
        employee: employee.clone(),
        amount,
        timestamp,
        note,
    };

    let mut history = load_history(env, &employee);
    history.push_back(record.clone());
    save_history(env, &employee, &history);

    // Update employer reputation score
    let emp_history: Vec<PaymentRecord> = history
        .iter()
        .filter(|r| r.employer == employer)
        .collect();

    if !emp_history.is_empty() {
        let payment_count = emp_history.len() as u32;
        let earliest = emp_history
            .iter()
            .map(|r| r.timestamp)
            .min()
            .unwrap_or(timestamp);
        let time_span = if timestamp > earliest {
            timestamp - earliest
        } else {
            1
        };
        let total_amount: i128 = emp_history.iter().map(|r| r.amount).sum();
        let avg_amount = total_amount / (payment_count as i128);

        let score = calculate_reputation(payment_count, time_span, total_amount, avg_amount);

        let credibility = CredibilityScore {
            employer: employer.clone(),
            score,
            payment_count,
            total_amount,
            last_payment_timestamp: timestamp,
        };

        env.storage()
            .persistent()
            .set(&employer_score_key(&employer), &credibility);

        env.events()
            .publish((symbol_short!("reputed"), employer.clone()), credibility);
    }

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

    pub fn get_reputation(env: Env, employer: Address) -> CredibilityScore {
        env.storage()
            .persistent()
            .get(&employer_score_key(&employer))
            .unwrap_or(CredibilityScore {
                employer,
                score: 0,
                payment_count: 0,
                total_amount: 0,
                last_payment_timestamp: 0,
            })
    }
}

