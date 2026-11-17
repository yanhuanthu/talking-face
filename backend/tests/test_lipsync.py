import asyncio
import unittest

from app.schemas import GenerateRequest
from app.services.lipsync import StubLipSyncEngine


class StubLipSyncEngineTest(unittest.TestCase):
    def test_submit_text_job(self) -> None:
        async def scenario() -> None:
            engine = StubLipSyncEngine()
            payload = GenerateRequest.model_validate(
                {
                    "source": {"name": "face.png", "type": "image/png", "size": 1024},
                    "inputMode": "text",
                    "text": "你好，欢迎使用 VoiceFace。",
                    "emotion": "温暖自然",
                    "settings": {"resolution": "720p", "fps": 25},
                }
            )
            result = await engine.submit(payload)
            self.assertTrue(result.jobId.startswith("VF-"))
            self.assertEqual(result.status, "queued")
            self.assertEqual(result.provider, "python-mock-lipsync-adapter")
            job = await engine.get_job(result.jobId)
            self.assertIsNotNone(job)
            self.assertEqual(job.progress, 8)

        asyncio.run(scenario())


if __name__ == "__main__":
    unittest.main()
