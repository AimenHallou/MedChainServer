//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract PatientRegistry {
    struct Patient {
        address owner;
        string patient_id;
        uint256 createdDate;
        string[] history;
        string[] txHashes;
    }

    mapping(string => Patient) public patients;

    event PatientCreated(
        string patient_id,
        address indexed owner,
        uint256 createdDate,
        string[] history,
        string[] txHashes
    );

    event AccessRequestAccepted(
        string patient_id,
        address indexed requestor,
        string[] files,
        string timestamp
    );

    event PatientUnshared(
        string patient_id,
        address indexed sharedWith,
        string timestamp
    );

    event AccessRequested(
        string patient_id,
        address indexed requestor,
        string timestamp
    );

    event AccessRequestCanceled(
        string patient_id,
        address indexed requestor,
        string timestamp
    );

    function createPatient(
        string memory _patient_id,
        string memory _historyEntry,
        string memory _txHash
    ) public {
        require(
            bytes(patients[_patient_id].patient_id).length == 0,
            "Patient ID already exists!"
        );

        uint256 currentTime = block.timestamp;
        patients[_patient_id] = Patient({
            owner: msg.sender,
            patient_id: _patient_id,
            createdDate: currentTime,
            history: new string[](1),
            txHashes: new string[](1)
        });
        patients[_patient_id].history[0] = _historyEntry;
        patients[_patient_id].txHashes[0] = _txHash;

        emit PatientCreated(
            _patient_id,
            msg.sender,
            currentTime,
            patients[_patient_id].history,
            patients[_patient_id].txHashes
        );
    }

    function acceptAccessRequest(
        string memory _patient_id,
        address _requestor,
        string[] memory _files
    ) public {
        require(
            patients[_patient_id].owner == msg.sender,
            "Only the owner can accept access requests"
        );
        emit AccessRequestAccepted(
            _patient_id,
            _requestor,
            _files,
            uint2str(block.timestamp)
        );
    }

    function unsharePatient(
        string memory _patient_id,
        address _sharedWith
    ) public {
        require(
            patients[_patient_id].owner == msg.sender,
            "Only the owner can unshare the patient"
        );
        emit PatientUnshared(
            _patient_id,
            _sharedWith,
            uint2str(block.timestamp)
        );
    }

    function requestAccess(
        string memory _patient_id,
        address _requestor
    ) public {
        require(
            patients[_patient_id].owner != address(0),
            "Patient does not exist!"
        );
        string memory timestamp = uint2str(block.timestamp);
        patients[_patient_id].history.push(
            string(
                abi.encodePacked(
                    "Access requested by ",
                    toAsciiString(_requestor),
                    " on ",
                    timestamp
                )
            )
        );
        emit AccessRequested(_patient_id, _requestor, timestamp);
    }

    function cancelAccessRequest(
        string memory _patient_id,
        address _requestor
    ) public {
        require(
            patients[_patient_id].owner != address(0),
            "Patient does not exist!"
        );
        require(
            patients[_patient_id].owner == msg.sender ||
                _requestor == msg.sender,
            "Only the owner or requestor can cancel the access request"
        );

        string memory timestamp = uint2str(block.timestamp);
        patients[_patient_id].history.push(
            string(
                abi.encodePacked(
                    "Access request by ",
                    toAsciiString(_requestor),
                    " cancelled on ",
                    timestamp
                )
            )
        );

        emit AccessRequestCanceled(_patient_id, _requestor, timestamp);
    }

    function uint2str(uint256 _i) internal pure returns (string memory) {
        if (_i == 0) {
            return "0";
        }
        uint256 j = _i;
        uint256 length;
        while (j != 0) {
            length++;
            j /= 10;
        }
        bytes memory bstr = new bytes(length);
        uint256 k = length - 1;
        while (_i != 0 && k > 0) {
            bstr[k--] = bytes1(uint8(48 + (_i % 10)));
            _i /= 10;
        }
        return string(bstr);
    }

    function toAsciiString(address x) internal pure returns (string memory) {
        bytes memory s = new bytes(42);
        s[0] = "0";
        s[1] = "x";
        for (uint i = 0; i < 20; i++) {
            bytes1 b = bytes1(uint8(uint(uint160(x)) / (2 ** (8 * (19 - i)))));
            bytes1 hi = bytes1(uint8(b) / 16);
            bytes1 lo = bytes1(uint8(b) - 16 * uint8(hi));
            s[2 * i + 2] = char(hi);
            s[2 * i + 3] = char(lo);
        }
        return string(s);
    }

    function char(bytes1 b) internal pure returns (bytes1 c) {
        if (uint8(b) < 10) return bytes1(uint8(b) + 0x30);
        else return bytes1(uint8(b) + 0x57);
    }

    function getPatientHistory(
        string memory _patient_id
    ) public view returns (string[] memory, string[] memory) {
        return (patients[_patient_id].history, patients[_patient_id].txHashes);
    }
}
