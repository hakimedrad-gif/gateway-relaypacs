import pydicom
from pydicom.dataset import FileDataset, FileMetaDataset
from pydicom.uid import ExplicitVRLittleEndian, generate_uid
import datetime

# Create a minimal DICOM file
suffix = '.dcm'
filename_little_endian = 'test_e2e.dcm'

file_meta = FileMetaDataset()
file_meta.MediaStorageSOPClassUID = '1.2.840.10008.5.1.4.1.1.2'
file_meta.MediaStorageSOPInstanceUID = generate_uid()
file_meta.ImplementationClassUID = generate_uid()
file_meta.TransferSyntaxUID = ExplicitVRLittleEndian

ds = FileDataset(filename_little_endian, {}, file_meta=file_meta, preamble=b"\0" * 128)

# Add basic metadata
ds.PatientName = "E2E^TEST^PATIENT"
ds.PatientID = "123456"
ds.AccessionNumber = "ACC123"
ds.Modality = "CT"
ds.StudyDate = datetime.date.today().strftime('%Y%m%d')
ds.SeriesInstanceUID = generate_uid()
ds.StudyInstanceUID = generate_uid()
ds.SOPInstanceUID = file_meta.MediaStorageSOPInstanceUID

ds.is_little_endian = True
ds.is_implicit_VR = False

ds.save_as(filename_little_endian)
print(f"Created {filename_little_endian}")
