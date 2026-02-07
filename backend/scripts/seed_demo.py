#!/usr/bin/env python3
"""
Demo seed script.
Populates database with sample data for demos.
"""
import os
import sys
import uuid
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings
from app.services.db.supabase_db import db_service
from app.services.rag.embedder import embed_text
from app.core.logging import safe_log_info, safe_log_error


def seed_demo():
    """Seed demo data."""
    print("🌱 Seeding demo data...")
    
    # Check if Supabase is configured
    if not db_service.is_configured():
        print("⚠️  Supabase not configured. Running in mock mode.")
        print("   Would seed:")
        print("   - 1 policy document with 10 chunks")
        print("   - 1 analyzed document with extraction")
        print("   - 1 chat session with 2 messages")
        print("   - 3 providers in cache")
        return
    
    user_id = settings.demo_user_id
    policy_doc_id = settings.demo_policy_doc_id
    
    try:
        # 1. Create policy document
        print("📄 Creating policy document...")
        policy_doc = db_service.create_document(
            user_id=user_id,
            doc_type="POLICY",
            file_name="demo_summary_of_benefits.pdf",
            mime_type="application/pdf",
            storage_path=f"user/{user_id}/policies/{policy_doc_id}/demo_sob.pdf"
        )
        
        if policy_doc:
            policy_doc_id = policy_doc["id"]
            print(f"   ✅ Created policy document: {policy_doc_id}")
            
            # Update status to ingested
            db_service.update_document_status(policy_doc_id, "ingested")
            
            # 2. Create policy chunks
            print("📚 Creating policy chunks...")
            demo_chunks = [
                {
                    "text": "Your health plan covers in-network office visits. Office visits apply to your deductible first. After your deductible is met, you pay a copayment or coinsurance.",
                    "chunk_index": 0,
                    "metadata": {"label": "Summary of Benefits — Office Visits"}
                },
                {
                    "text": "The deductible is the amount you pay for covered services before your plan starts to pay. For individual plans, the deductible is typically $1,500 per year.",
                    "chunk_index": 1,
                    "metadata": {"label": "Summary of Benefits — Deductible"}
                },
                {
                    "text": "In-network providers are healthcare providers who have agreed to accept your plan's payment rates. You pay less when you use in-network providers.",
                    "chunk_index": 2,
                    "metadata": {"label": "Summary of Benefits — Network"}
                },
                {
                    "text": "Out-of-network providers may charge more than your plan's allowed amount. You may be responsible for the difference between the provider's charge and the allowed amount.",
                    "chunk_index": 3,
                    "metadata": {"label": "Summary of Benefits — Out of Network"}
                },
                {
                    "text": "Preventive care services, such as annual checkups and immunizations, are covered at 100% with no deductible or copayment when you use in-network providers.",
                    "chunk_index": 4,
                    "metadata": {"label": "Summary of Benefits — Preventive Care"}
                }
            ]
            
            from app.services.db.policies_repo import create_policy_chunks_batch
            
            chunks_with_embeddings = []
            for chunk in demo_chunks:
                embedding = embed_text(chunk["text"])
                chunks_with_embeddings.append({
                    "text": chunk["text"],
                    "chunk_index": chunk["chunk_index"],
                    "embedding": embedding,
                    "metadata": chunk["metadata"]
                })
            
            chunks_created = create_policy_chunks_batch(policy_doc_id, chunks_with_embeddings)
            print(f"   ✅ Created {chunks_created} policy chunks")
        
        # 3. Create analyzed document
        print("📋 Creating analyzed document...")
        doc_id = str(uuid.uuid4())
        analyzed_doc = db_service.create_document(
            user_id=user_id,
            doc_type="EOB",
            file_name="demo_eob.pdf",
            mime_type="application/pdf",
            storage_path=f"user/{user_id}/docs/{doc_id}/demo_eob.pdf"
        )
        
        if analyzed_doc:
            doc_id = analyzed_doc["id"]
            db_service.update_document_status(doc_id, "analyzed")
            
            # Create extraction
            extraction_id = db_service.create_extraction(
                doc_id=doc_id,
                patient_responsibility=215.44,
                provider="Example Medical Group",
                service_date="2025-11-03",
                plain_english_summary="Your plan reduced the charge to an allowed amount. Because your deductible applies, you may owe the allowed amount.",
                next_steps=[
                    "Confirm the provider was in-network on the date of service.",
                    "Check whether the deductible was already met."
                ],
                raw_extraction={}
            )
            
            if extraction_id:
                # Create line items
                db_service.create_line_items(extraction_id, [
                    {
                        "description": "Office visit",
                        "cpt": "99213",
                        "billed": 310.0,
                        "allowed": 180.0,
                        "plan_paid": 0.0,
                        "you_owe": 180.0,
                        "network_status": "in_network"
                    }
                ])
                print(f"   ✅ Created analyzed document: {doc_id}")
        
        # 4. Create chat session
        print("💬 Creating chat session...")
        session_id = str(uuid.uuid4())
        session = db_service.client.table("chat_sessions").insert({
            "id": session_id,
            "user_id": user_id,
            "title": "Demo Chat"
        }).execute()
        
        if session.data:
            # Create messages
            user_msg_id = str(uuid.uuid4())
            assistant_msg_id = str(uuid.uuid4())
            
            db_service.client.table("chat_messages").insert([
                {
                    "id": user_msg_id,
                    "session_id": session_id,
                    "role": "user",
                    "content": "Why do I owe this much for my office visit?"
                },
                {
                    "id": assistant_msg_id,
                    "session_id": session_id,
                    "role": "assistant",
                    "content": "Based on your plan summary, in-network office visits apply to the deductible first. If your deductible is not met, you may owe the allowed amount.",
                    "assistant_response": {
                        "citations": [
                            {
                                "doc_id": policy_doc_id,
                                "chunk_id": "chunk_0",
                                "label": "Summary of Benefits — Office Visits"
                            }
                        ],
                        "confidence": 0.74,
                        "disclaimer": "I'm not a lawyer or your insurer; verify with your plan documents or insurer."
                    }
                }
            ]).execute()
            print(f"   ✅ Created chat session: {session_id}")
        
        # 5. Create providers
        print("🏥 Creating providers...")
        from app.services.db.providers_repo import upsert_provider
        
        providers = [
            {
                "provider_id": "demo_prov_001",
                "name": "UPMC Dermatology",
                "npi": "1234567890",
                "address": "200 Lothrop St, Pittsburgh, PA 15213",
                "phone": "+1-412-555-0101",
                "types": ["doctor", "health", "dermatology"]
            },
            {
                "provider_id": "demo_prov_002",
                "name": "Allegheny Health Network",
                "npi": "0987654321",
                "address": "320 E North Ave, Pittsburgh, PA 15212",
                "phone": "+1-412-555-0102",
                "types": ["hospital", "health"]
            },
            {
                "provider_id": "demo_prov_003",
                "name": "UPMC Internal Medicine",
                "npi": "1122334455",
                "address": "200 Lothrop St, Pittsburgh, PA 15213",
                "phone": "+1-412-555-0103",
                "types": ["doctor", "health", "internal_medicine"]
            }
        ]
        
        for provider in providers:
            upsert_provider(provider)
        
        print(f"   ✅ Created {len(providers)} providers")
        
        print("\n✅ Demo seed complete!")
        print("\n📋 Demo Checklist:")
        print(f"   Session ID: {session_id}")
        print(f"   Policy Doc ID: {policy_doc_id}")
        print(f"   Document ID: {doc_id}")
        print("\n   Test endpoints:")
        print(f"   curl -H 'Authorization: Bearer <token>' http://localhost:8000/v1/chat/sessions/{session_id}")
        print(f"   curl -H 'Authorization: Bearer <token>' http://localhost:8000/v1/docs/{doc_id}")
        print(f"   curl -H 'Authorization: Bearer <token>' 'http://localhost:8000/v1/providers/search?query=Dermatologist&lat=40.4433&lng=-79.9436'")
        
    except Exception as e:
        safe_log_error("Failed to seed demo data", e)
        print(f"❌ Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    seed_demo()
